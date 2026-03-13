/**
 * OSA (Old Students Association) Backend API
 * Product Name: OSA — Old Students Platform
 * Company: ICUNI Group — ICUNI Labs Division
 *
 * This Google Apps Script handles all backend API logic for the OSA React Frontend.
 * It is designed to be deployed as a Web App (run as "Me", accessible to "Anyone").
 * 
 * Required Google Sheets:
 * 1. year_groups
 * 2. members
 * 3. posts
 * 4. campaigns
 * 5. donations
 * 6. events
 * 7. rsvps
 * 8. newsletters
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

/**
 * Handle HTTP OPTIONS request for CORS preflight
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
/**
 * Handle HTTP POST requests (for mutations and some queries with larger payloads)
 */
function doPost(e) {
  try {
    let payloadStr = e.postData.contents;
    // Handle application/x-www-form-urlencoded if needed, but we expect application/json
    let request;
    try {
      request = JSON.parse(payloadStr);
    } catch (parseErr) {
      // Fallback if data is sent differently
      return jsonResponse({ success: false, error: "Invalid JSON payload" });
    }

    const action = request.action;
    const data = request.data || {};
    const token = request.token;

    let responseData = handleAction(action, data, token);
    return jsonResponse(responseData);
    
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, error: error.message });
  }
}

/**
 * Handle HTTP GET requests
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const token = e.parameter.token;
    let dataStr = e.parameter.data || "{}";
    let data;
    try {
       data = JSON.parse(dataStr);
    } catch(err){
       data = {};
    }
    
    // Add simple ping route for testing
    if (action === "ping") {
        return jsonResponse({ success: true, message: "OSA Backend is running" });
    }

    let responseData = handleAction(action, data, token);
    return jsonResponse(responseData);

  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, error: error.message });
  }
}

/**
 * Helper to build JSON responses. 
 * NOTE: Google Apps Script Web Apps automatically append CORS headers when deployed as "Execute as Me" and "Access: Anyone". 
 * However, we must ensure we return a successful response to OPTIONS, and that the payload is formatted correctly.
 */
function jsonResponse(obj) {
  let output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Main action router
 */
function handleAction(action, data, token) {
  // Public actions (no token required)
  if (action === "login") {
    return handleLogin(data);
  } else if (action === "register") {
    return handleRegister(data);
  } else if (action === "resetPassword") {
    return handleResetPassword(data);
  } else if (action === "getSchools") {
    // For V1, we hardcode the school list for the landing page or pull from Master
    return {
      success: true,
      data: [{
        id: "AMOSA",
        name: "Aggrey Memorial A.M.E. Zion Senior High School",
        short_code: "AGGREY",
        association: "AMOSA",
        city: "Cape Coast",
        year_groups_count: Object.keys(getYearGroupsData()).length
      }]
    };
  } else if (action === "getYearGroupsList") {
      let ygs = getYearGroupsData();
      return { success: true, data: Object.values(ygs).map(y => ({id: y.id, year: y.year, nickname: y.nickname})) };
  }

  // All other actions require a valid session token
  const user = validateToken(token);
  if (!user) {
    return { success: false, error: "Invalid or expired token", code: 401 };
  }

  // Protected actions
  switch (action) {
    case "getDashboard":
      return getDashboard(user);
    case "getProfile":
      return getProfile(user);
    case "updateProfile":
      return updateProfile(user, data);
    case "getMembers":
      return getMembers(user, data);
      
    // Board & Gallery
    case "getBoardMessages":
      return getBoardMessages(user, data);
    case "postBoardMessage":
      return postBoardMessage(user, data);
    case "addBoardComment":
      return addBoardComment(user, data);
    case "reactBoardMessage":
      return reactBoardMessage(user, data);
    case "getAlbums":
      return getAlbums(user, data);
    case "createAlbum":
      return createAlbum(user, data);
    case "getGalleryItems":
      return getGalleryItems(user, data);
    case "uploadImage":
      return uploadImage(user, data);
    
    // Newsletter / Posts
    case "getPosts":
      return getPosts(user, data);
    case "submitPost":
      return submitPost(user, data);
    case "approvePost":
    case "returnPost":
      requireRole(user, ["YG Admin", "Platform Admin", "Super Admin"]);
      return updatePostStatus(user, action, data);
    case "dispatchNewsletter":
      requireRole(user, ["YG Admin", "Platform Admin", "Super Admin"]);
      return dispatchNewsletter(user, data);

    // Fundraising
    case "getCampaigns":
      return getCampaigns(user, data);
    case "createCampaign":
      requireRole(user, ["YG Admin", "Platform Admin", "Super Admin"]);
      return createCampaign(user, data);
    case "donate":
      return handleDonation(user, data);

    // Events
    case "getEvents":
      return getEvents(user, data);
    case "createEvent":
      requireRole(user, ["YG Admin", "Platform Admin", "Super Admin"]);
      return createEvent(user, data);
    case "rsvp":
      return rsvpToEvent(user, data);
      
    // Admin
    case "getAdminData":
      requireRole(user, ["YG Admin", "Platform Admin", "Super Admin"]);
      return getAdminData(user);

    default:
      return { success: false, error: "Unknown action" };
  }
}

// ==========================================
// Authentication & Session Management
// ==========================================

function handleLogin(data) {
  const { email, password } = data;
  if (!email || !password) return { success: false, error: "Missing credentials" };

  const membersSheet = getSheet("members");
  const headers = getHeaders(membersSheet);
  const rows = membersSheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.email.toLowerCase() === email.toLowerCase()) {
      // Basic check (In a real app, use bcrypt hashing)
      if (rowObj.password === password) {
        // Create session token
        const token = Utilities.getUuid();
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7); // 7 day expiry
        
        // Update token in sheet
        let rowToUpdate = i + 1;
        membersSheet.getRange(rowToUpdate, headers.indexOf("session_token") + 1).setValue(token);
        membersSheet.getRange(rowToUpdate, headers.indexOf("token_expiry") + 1).setValue(expiry.toISOString());
        
        // Return safe user object
        delete rowObj.password;
        delete rowObj.session_token;
        return { 
          success: true, 
          data: { 
            token: token, 
            user: applyPrivacyFilters(rowObj, rowObj) // Self can see everything
          } 
        };
      }
    }
  }
  return { success: false, error: "Invalid email or password" };
}

function handleRegister(data) {
  const { name, email, password, year_group_id, final_class, house_name } = data;
  if (!name || !email || !password || !year_group_id) {
    return { success: false, error: "Missing required fields" };
  }

  const membersSheet = getSheet("members");
  const headers = getHeaders(membersSheet);
  
  // Check if email exists
  const rows = membersSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf("email")].toLowerCase() === email.toLowerCase()) {
      return { success: false, error: "Email already registered" };
    }
  }

  // Get year group details to attach correct cheque color
  const ygSheet = getSheet("year_groups");
  const ygHeaders = getHeaders(ygSheet);
  const ygRows = ygSheet.getDataRange().getValues();
  let cheque_color = "#1E293B"; // Default slate
  let yg_nickname = "";
  let school = "Aggrey Memorial";
  let assoc = "AMOSA";

  for(let i=1; i<ygRows.length; i++) {
     let ygRow = rowToObject(ygRows[i], ygHeaders);
     if(ygRow.id === year_group_id) {
        cheque_color = ygRow.cheque_colour;
        yg_nickname = ygRow.nickname;
        break;
     }
  }

  const newId = Utilities.getUuid();
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  const newRowObj = {
    id: newId,
    name: name,
    email: email.toLowerCase(),
    password: password, // In prod, hash this
    role: "Member",
    year_group_id: year_group_id,
    year_group_nickname: yg_nickname,
    final_class: final_class || "",
    house_name: house_name || "",
    cheque_colour: cheque_color,
    school: school,
    association: assoc,
    date_joined: new Date().toISOString(),
    session_token: token,
    token_expiry: expiry.toISOString(),
    // Privacy defaults
    priv_email: "yeargroup",
    priv_phone: "hidden",
    priv_location: "all",
    priv_profession: "all",
    priv_linkedin: "all",
    priv_bio: "yeargroup",
    bio: "",
    profession: "",
    location: "",
    phone: "",
    linkedin: ""
  };

  const newRowArray = headers.map(h => newRowObj[h] !== undefined ? newRowObj[h] : "");
  membersSheet.appendRow(newRowArray);
  
  // Return user obj without secrets
  delete newRowObj.password;
  delete newRowObj.session_token;
  
  return {
    success: true,
    data: {
      token: token,
      user: newRowObj
    }
  };
}

function handleResetPassword(data) {
   return { success: false, error: "Not implemented in v1 mock" };
}

function validateToken(token) {
  if (!token) return null;
  const membersSheet = getSheet("members");
  const headers = getHeaders(membersSheet);
  const rows = membersSheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.session_token === token) {
      const expiry = new Date(rowObj.token_expiry);
      if (expiry > new Date()) {
        rowObj.rowIndex = i + 1; // Preserve row index for updates
        delete rowObj.password;
        return rowObj;
      }
    }
  }
  return null;
}

function requireRole(user, allowedRoles) {
  if (user.role === "Super Admin" || user.role === "IT Department") return true;
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }
}

// ==========================================
// Dashboard & Profile
// ==========================================

function getDashboard(user) {
  // Assemble basic stats
  const ygs = getSheetData("members").filter(m => m.year_group_id === user.year_group_id);
  const posts = getSheetData("posts").filter(p => p.year_group_id === user.year_group_id && p.status === "Approved");
  const activeCampaigns = getSheetData("campaigns").filter(c => c.status === "active" && (c.scope === "school" || (c.scope === "yeargroup" && c.year_group_id === user.year_group_id)));
  
  const upcomingEvents = getSheetData("events").filter(e => {
     let isVisible = (e.scope === "platform" || e.scope === "school" || (e.scope === "yeargroup" && e.year_group_id === user.year_group_id));
     return isVisible && e.status !== "past";
  });

  return {
    success: true,
    data: {
      stats: {
        ygMembersCount: ygs.length,
        activeCampaignsCount: activeCampaigns.length,
        upcomingEventsCount: upcomingEvents.length
      },
      recentPosts: posts.slice(-3).reverse(), // Last 3
      upcomingEvents: upcomingEvents.slice(0, 3)
    }
  };
}

function getProfile(user) {
  return { success: true, data: user };
}

function updateProfile(user, data) {
  const allowedFields = ["name", "bio", "profession", "location", "phone", "linkedin", 
                         "priv_bio", "priv_profession", "priv_location", "priv_phone", "priv_linkedin", "priv_email"];
  
  const sheet = getSheet("members");
  const headers = getHeaders(sheet);
  
  let updatedAny = false;
  
  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      sheet.getRange(user.rowIndex, headers.indexOf(field) + 1).setValue(data[field]);
      user[field] = data[field];
      updatedAny = true;
    }
  });
  
  return { success: true, data: user };
}

// ==========================================
// Directory (Members) & Privacy Engine
// ==========================================

function getMembers(user, data) {
  const scope = data.scope || "yeargroup"; // "yeargroup", "school", "all"
  
  const allMembers = getSheetData("members");
  let filteredMembers = [];
  
  for (let member of allMembers) {
    // Determine scope visibility
    if (scope === "yeargroup" && member.year_group_id !== user.year_group_id) continue;
    if (scope === "school" && member.school !== user.school) continue;
    // (If platform scope, handled appropriately)

    // Apply privacy rules per field
    let safeMember = applyPrivacyFilters(member, user);
    filteredMembers.push(safeMember);
  }
  
  return { success: true, data: filteredMembers };
}

/**
 * Filter sensitive fields based on the viewer's relationship to the member
 */
function applyPrivacyFilters(targetMember, viewerUser) {
  // Super Admi sees all
  if (viewerUser.role === "IT Department" || viewerUser.role === "Super Admin" || targetMember.id === viewerUser.id) {
     return targetMember; 
  }

  let safeTarget = { ...targetMember };
  delete safeTarget.password;
  delete safeTarget.session_token;
  delete safeTarget.token_expiry;

  const relationship = (targetMember.year_group_id === viewerUser.year_group_id) ? "yeargroup" : "all";
  
  const privFields = ["email", "phone", "location", "profession", "linkedin", "bio"];
  
  privFields.forEach(field => {
    let setting = safeTarget["priv_" + field] || "hidden";
    
    if (setting === "hidden") {
      delete safeTarget[field];
    } else if (setting === "yeargroup") {
         if(relationship !== "yeargroup") delete safeTarget[field];
    }
    // if 'all', it's visible. So keep it.
  });

  return safeTarget;
}


// ==========================================
// Newsletter & Posts
// ==========================================

function getPosts(user, data) {
  const allPosts = getSheetData("posts");
  let userPosts = allPosts.filter(p => p.year_group_id === user.year_group_id);
  
  // If not admin, only show Approved + own drafts
  let isYGAdmin = user.role.includes("Admin") || user.role.includes("President");
  
  if (!isYGAdmin) {
    userPosts = userPosts.filter(p => p.status === "Approved" || p.author_id === user.id);
  }
  
  // Sort descending by date
  userPosts.sort((a,b) => new Date(b.submission_date) - new Date(a.submission_date));
  
  return { success: true, data: userPosts };
}

function submitPost(user, data) {
  const { title, category, content } = data;
  if (!title || !category || !content) return { success: false, error: "Missing fields" };

  const sheet = getSheet("posts");
  const headers = getHeaders(sheet);
  
  const newPost = {
    id: Utilities.getUuid(),
    title: title,
    category: category,
    content: content,
    author_id: user.id,
    author_name: user.name,
    year_group_id: user.year_group_id,
    submission_date: new Date().toISOString(),
    status: "Pending",
    newsletter_month: "",
    rejection_note: ""
  };

  sheet.appendRow(headers.map(h => newPost[h] || ""));
  return { success: true, data: newPost };
}

function updatePostStatus(user, action, data) {
  const { post_id, note } = data;
  const sheet = getSheet("posts");
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  
  for(let i=1; i<rows.length; i++){
    let row = rowToObject(rows[i], headers);
    if(row.id === post_id) {
       // Check if they have rights to this YG
       if(user.role !== "Super Admin" && !user.role.includes("Platform") && row.year_group_id !== user.year_group_id) {
           return { success: false, error: "Action not permitted for this year group." };
       }

       let newStatus = action === "approvePost" ? "Approved" : "Rejected";
       sheet.getRange(i+1, headers.indexOf("status")+1).setValue(newStatus);
       
       let nMonth = "";
       if(newStatus === "Approved") {
           const d = new Date();
           nMonth = d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,'0');
           sheet.getRange(i+1, headers.indexOf("newsletter_month")+1).setValue(nMonth);
       }
       if(note) {
           sheet.getRange(i+1, headers.indexOf("rejection_note")+1).setValue(note);
       }
       return { success: true, message: `Post ${newStatus}` };
    }
  }
  return { success: false, error: "Post not found" };
}


// ==========================================
// Fundraising
// ==========================================

function getCampaigns(user, data) {
  const scopeFilter = data.scope || "all"; // my_school, all
  
  const allCampaigns = getSheetData("campaigns");
  const visible = allCampaigns.filter(c => {
     if(c.scope === "yeargroup" && c.year_group_id !== user.year_group_id) return false;
     if(scopeFilter === "my_school" && c.school !== user.school) return false;
     return true;
  });
  
  visible.forEach(c => c.updates = safeJsonParse(c.updates, []));
  
  return { success: true, data: visible };
}

function handleDonation(user, data) {
   const { campaign_id, amount } = data;
   if(!amount || isNaN(amount)) return { success: false, error: "Invalid amount" };

   // Log donation
   const sheet = getSheet("donations");
   const headers = getHeaders(sheet);
   sheet.appendRow(headers.map(h => {
       if(h==="id") return Utilities.getUuid();
       if(h==="campaign_id") return campaign_id;
       if(h==="donor_id") return user.id;
       if(h==="amount") return amount;
       if(h==="timestamp") return new Date().toISOString();
       return "";
   }));
   
   // Update campaign totals
   const campSheet = getSheet("campaigns");
   const cHeaders = getHeaders(campSheet);
   const rows = campSheet.getDataRange().getValues();
   for(let i=1; i<rows.length; i++) {
     let r = rowToObject(rows[i], cHeaders);
     if(r.id === campaign_id) {
        let nRaised = (parseFloat(r.raised_amount) || 0) + parseFloat(amount);
        let nDonors = parseInt(r.donor_count || 0) + 1;
        campSheet.getRange(i+1, cHeaders.indexOf("raised_amount")+1).setValue(nRaised);
        campSheet.getRange(i+1, cHeaders.indexOf("donor_count")+1).setValue(nDonors);
        break;
     }
   }
   
   return { success: true, message: "Donation logged", data: { amount } };
}

// ==========================================
// Events
// ==========================================

function getEvents(user, data) {
  const scopeFilter = data.scope || "all";
  
  const events = getSheetData("events");
  const visible = events.filter(e => {
     if(e.scope === "yeargroup" && e.year_group_id !== user.year_group_id && user.role !== "Super Admin") return false;
     return true;
  });

  // Check RSVPs
  const rsvps = getSheetData("rsvps").filter(r => r.user_id === user.id);
  const myRsvpIds = rsvps.map(r => r.event_id);

  visible.forEach(e => {
     e.is_rsvpd = myRsvpIds.includes(e.id);
     // Hide virtual link if not RSVPd
     if(!e.is_rsvpd) {
        e.virtual_link = "";
     }
  });

  return { success: true, data: visible };
}

function rsvpToEvent(user, data) {
   const { event_id } = data;
   
   // Check if already 
   const rsvps = getSheetData("rsvps");
   let found = rsvps.find(r => r.event_id === event_id && r.user_id === user.id);
   const sheet = getSheet("rsvps");

   if (found) {
     // Currently we don't have a remove row logic helper, typically you'd clear row or filter
     return { success: true, message: "Already RSVP'd" };
   }

   const headers = getHeaders(sheet);
   sheet.appendRow(headers.map(h => {
       if(h==="id") return Utilities.getUuid();
       if(h==="event_id") return event_id;
       if(h==="user_id") return user.id;
       if(h==="timestamp") return new Date().toISOString();
       return "";
   }));
   
   // If it has a virtual link, return it
   const evts = getSheetData("events");
   let evt = evts.find(e => e.id === event_id);
   return { success: true, data: { virtual_link: evt ? evt.virtual_link : "" } };
}

// ==========================================
// Board & Gallery
// ==========================================

function uploadImage(user, data) {
    const { group_id, album_id, album_name, image_base64, file_name } = data;
    if (!image_base64) return { success: false, error: "No image provided" };

    try {
      // Find or create base "OSA_Uploads" root folder
      let rootFolder;
      let folders = DriveApp.getFoldersByName("OSA_Uploads");
      if (folders.hasNext()) {
          rootFolder = folders.next();
      } else {
          rootFolder = DriveApp.createFolder("OSA_Uploads");
      }

      // Find or create group subfolder
      let targetFolder;
      let subfolders = rootFolder.getFoldersByName(group_id || "general");
      if (subfolders.hasNext()) {
          targetFolder = subfolders.next();
      } else {
          targetFolder = rootFolder.createFolder(group_id || "general");
      }
      
      // If album_id is provided, find or create album subfolder
      if (album_id && group_id !== "profile_pics") {
          let albumFolderName = album_name || album_id;
          let albumFolders = targetFolder.getFoldersByName(albumFolderName);
          if (albumFolders.hasNext()) {
              targetFolder = albumFolders.next();
          } else {
              targetFolder = targetFolder.createFolder(albumFolderName);
          }
      }

      // Decode base64
      const base64Data = image_base64.split(',')[1] || image_base64;
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/jpeg", file_name || "upload.jpg");
      const file = targetFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      const url = "https://drive.google.com/uc?export=view&id=" + file.getId();

      // Log the upload in the gallery if it's not a profile picture
      if (group_id !== "profile_pics") {
        const gSheet = getSheet("galleries");
        const headers = getHeaders(gSheet);
        gSheet.appendRow(headers.map(h => {
          if(h==="id") return Utilities.getUuid();
          if(h==="group_id") return group_id;
          if(h==="album_id") return album_id || "";
          if(h==="uploaded_by_id") return user.id;
          if(h==="uploaded_by_name") return user.name;
          if(h==="url") return url;
          if(h==="timestamp") return new Date().toISOString();
          return "";
        }));
      }

      return { success: true, data: { url: url } };
    } catch(err) {
      return { success: false, error: err.toString() };
    }
}

function getAlbums(user, data) {
    const albums = getSheetData("albums").filter(a => a.group_id === data.group_id);
    return { success: true, data: albums.reverse() };
}

function createAlbum(user, data) {
    const { group_id, name, description } = data;
    if (!name) return { success: false, error: "Name required" };
    
    const sheet = getSheet("albums");
    const headers = getHeaders(sheet);
    let id = Utilities.getUuid();
    sheet.appendRow(headers.map(h => {
        if(h==="id") return id;
        if(h==="group_id") return group_id;
        if(h==="name") return name;
        if(h==="description") return description || "";
        if(h==="created_by_id") return user.id;
        if(h==="created_by_name") return user.name;
        if(h==="timestamp") return new Date().toISOString();
        return "";
    }));
    return { success: true, data: { id, name, description } };
}

function getGalleryItems(user, data) {
    let images = getSheetData("galleries").filter(g => g.group_id === data.group_id);
    if (data.album_id) {
        images = images.filter(g => g.album_id === data.album_id);
    }
    return { success: true, data: images.reverse() };
}

function getBoardMessages(user, data) {
    const group_id = data.group_id || user.year_group_id;
    let msgs = getSheetData("board_messages").filter(m => m.group_id === group_id);
    
    msgs.forEach(m => {
        m.comments = safeJsonParse(m.comments, []);
        m.reactions = safeJsonParse(m.reactions, []);
    });

    return { success: true, data: msgs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)) };
}

function postBoardMessage(user, data) {
    const { group_id, content } = data;
    if(!content) return { success: false, error: "Content empty" };

    const sheet = getSheet("board_messages");
    const headers = getHeaders(sheet);
    let msgId = Utilities.getUuid();
    sheet.appendRow(headers.map(h => {
        if(h==="id") return msgId;
        if(h==="group_id") return group_id;
        if(h==="author_id") return user.id;
        if(h==="author_name") return user.name;
        if(h==="content") return content;
        if(h==="comments") return "[]";
        if(h==="reactions") return "[]";
        if(h==="timestamp") return new Date().toISOString();
        return "";
    }));
    return { success: true, data: { id: msgId } };
}

function addBoardComment(user, data) {
    const { message_id, content } = data;
    const sheet = getSheet("board_messages");
    const headers = getHeaders(sheet);
    const rows = sheet.getDataRange().getValues();

    for(let i=1; i<rows.length; i++) {
        let row = rowToObject(rows[i], headers);
        if(row.id === message_id) {
            let comments = safeJsonParse(row.comments, []);
            comments.push({
                author_id: user.id,
                author_name: user.name,
                content: content,
                timestamp: new Date().toISOString()
            });
            sheet.getRange(i+1, headers.indexOf("comments")+1).setValue(JSON.stringify(comments));
            return { success: true, message: "Comment added" };
        }
    }
    return { success: false, error: "Message not found" };
}

function reactBoardMessage(user, data) {
    const { message_id, emoji } = data;
    const sheet = getSheet("board_messages");
    const headers = getHeaders(sheet);
    const rows = sheet.getDataRange().getValues();

    for(let i=1; i<rows.length; i++) {
        let row = rowToObject(rows[i], headers);
        if(row.id === message_id) {
            let reactions = safeJsonParse(row.reactions, []);
            let existing = reactions.find(r => r.emoji === emoji);
            if(existing) existing.count += 1;
            else reactions.push({ emoji: emoji, count: 1 });

            sheet.getRange(i+1, headers.indexOf("reactions")+1).setValue(JSON.stringify(reactions));
            return { success: true, message: "Reaction added" };
        }
    }
    return { success: false, error: "Message not found" };
}


// ==========================================
// DB Utility Helpers
// ==========================================

function getDB() {
  // Bound to the official OSA Database Spreadsheet
  return SpreadsheetApp.openById("1mXY-MoxvTiUcDOtOYkDoG2PtaE2-aN0JpvpCrDA2Jcc");
}

function getSheet(name) {
  let sheet = getDB().getSheetByName(name);
  if (!sheet) {
      console.log("Sheet " + name + " not found. Auto-initializing schema.");
      INITIALIZE_SHEETS();
      sheet = getDB().getSheetByName(name);
  }
  return sheet;
}

function getHeaders(sheet) {
  // Return the first row as lowercase header names
  if (!sheet) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().replace(/\s+/g, '_'));
}

function getSheetData(name) {
  const sheet = getSheet(name);
  if (!sheet) return [];
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  const data = [];
  for (let i = 1; i < rows.length; i++) {
     if(!rows[i][0]) continue; // skip completely empty rows
     data.push(rowToObject(rows[i], headers));
  }
  return data;
}

function rowToObject(rowArray, headers) {
  let obj = {};
  headers.forEach((h, index) => {
    obj[h] = rowArray[index];
  });
  return obj;
}

function safeJsonParse(str, defaultVal) {
  try {
    let parsed = JSON.parse(str);
    return parsed || defaultVal;
  } catch(e) {
    return defaultVal;
  }
}

function getYearGroupsData() {
   let rows = getSheetData("year_groups");
   let map = {};
   rows.forEach(r => map[r.id] = r);
   return map;
}

/**
 * Utility to run once to setup sheets schema manually if empty.
 */
function INITIALIZE_SHEETS() {
    const ss = getDB();
    const sheetsToCreate = {
        "year_groups": ["id", "school", "year", "nickname", "house_name", "cheque_colour"],
        "members": ["id", "name", "email", "password", "role", "year_group_id", "year_group_nickname", "final_class", "house_name", "cheque_colour", "school", "association", "date_joined", "session_token", "token_expiry", "priv_email", "priv_phone", "priv_location", "priv_profession", "priv_linkedin", "priv_bio", "bio", "profession", "location", "phone", "linkedin", "profile_pic"],
        "posts": ["id", "title", "category", "content", "author_id", "author_name", "year_group_id", "submission_date", "status", "newsletter_month", "rejection_note"],
        "campaigns": ["id", "title", "type", "description", "target_amount", "currency", "deadline", "scope", "year_group_id", "status", "raised_amount", "donor_count", "updates", "created_by"],
        "donations": ["id", "campaign_id", "donor_id", "amount", "timestamp", "payment_method"],
        "events": ["id", "title", "type", "description", "date", "time", "virtual_link", "venue", "scope", "year_group_id", "max_attendees", "status", "created_by"],
        "rsvps": ["id", "event_id", "user_id", "timestamp"],
        "newsletters": ["id", "month", "year_group_id", "post_ids", "recipient_count", "dispatched_by", "timestamp"],
        "board_messages": ["id", "group_id", "author_id", "author_name", "content", "comments", "reactions", "timestamp"],
        "albums": ["id", "group_id", "name", "description", "created_by_id", "created_by_name", "timestamp"],
        "galleries": ["id", "group_id", "album_id", "uploaded_by_id", "uploaded_by_name", "url", "timestamp"]
    };

    for (let s in sheetsToCreate) {
        let sheet = ss.getSheetByName(s);
        if (!sheet) {
            sheet = ss.insertSheet(s);
            sheet.appendRow(sheetsToCreate[s]);
        }
    }
}
