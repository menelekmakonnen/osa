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
  } else if (action === "onboardSchool") {
    return handleOnboardSchool(data);
  } else if (action === "resetPassword") {
    return handleResetPassword(data);
  } else if (action === "ping") {
    return { success: true, message: "PONG" };
  } else if (action === "sync_schema") {
    INITIALIZE_SHEETS();
    return { success: true, message: "Schema migrated successfully" };
  } else if (action === "getSchools") {
      let schools = getSheetData("schools");
      if (schools.length === 0) {
        // Fallback for empty new instances
        return {
          success: true,
          data: [{
            id: "AMOSA",
            name: "Aggrey Memorial A.M.E. Zion Senior High School",
            short_code: "AGGREY",
            type: "Mixed",
            association: "AMOSA",
            city: "Cape Coast",
            classes: "[]",
            houses: "[]",
            year_groups_count: Object.keys(getYearGroupsData()).length
          }]
        };
      }
      return { success: true, data: schools.map(s => ({
         id: s.id,
         name: s.name,
         short_code: String(s.name || "UNNAMED").substring(0, 6).toUpperCase(), // Basic shortcode gen
         type: s.type,
         classes: s.classes,
         houses: s.houses
      })) };
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
    case "assignRole":
      return assignTargetRole(user, data);
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
      enforceRoleHierarchy(user, "Member", [1, 2, 3]); // Must be at least Tier 1 (YG Exec)
      return updatePostStatus(user, action, data);
    case "dispatchNewsletter":
      enforceRoleHierarchy(user, "Member", [1, 2, 3]); // Must be at least Tier 1
      return dispatchNewsletter(user, data);

    // Fundraising
    case "getCampaigns":
      return getCampaigns(user, data);
    case "createCampaign":
      enforceRoleHierarchy(user, "Member", [1, 2, 3]);
      return createCampaign(user, data);
    case "donate":
      return handleDonation(user, data);

    // Events
    case "getEvents":
      return getEvents(user, data);
    case "createEvent":
      enforceRoleHierarchy(user, "Member", [1, 2, 3]);
      return createEvent(user, data);
    case "rsvp":
      return rsvpToEvent(user, data);
      
    // Admin
    case "getAdminData":
      enforceRoleHierarchy(user, "Member", [1, 2, 3]);
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
  const { name, username, email, password, year_group_id, school_id, new_yg_year, new_yg_nickname, final_class, house_name, gender } = data;
  if (!name || !username || !email || !password || (!year_group_id && !new_yg_year) || !school_id) {
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
  let assoc = "AMOSA";

  let actual_yg_id = year_group_id;

  if (year_group_id === "new_yg" && new_yg_year && new_yg_nickname) {
     actual_yg_id = Utilities.getUuid();
     yg_nickname = new_yg_nickname;
     // Create the new year group dynamically
     ygSheet.appendRow([actual_yg_id, school_id, new_yg_year, new_yg_nickname, "", cheque_color]);
  } else {
     for(let i=1; i<ygRows.length; i++) {
        let ygRow = rowToObject(ygRows[i], ygHeaders);
        if(ygRow.id === year_group_id) {
           cheque_color = ygRow.cheque_colour;
           yg_nickname = ygRow.nickname;
           break;
        }
     }
  }

  const newId = Utilities.getUuid();
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  const newRowObj = {
    id: newId,
    name: name,
    username: username,
    email: email.toLowerCase(),
    password: password, // In prod, hash this
    role: "Member",
    year_group_id: actual_yg_id,
    year_group_nickname: yg_nickname,
    final_class: final_class || "",
    house_name: house_name || "",
    gender: gender || "",
    cheque_colour: cheque_color,
    school: school_id,
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

function handleOnboardSchool(data) {
  const { name, username, email, password, new_school_name, new_school_motto, new_school_colours, new_school_cheque_representation, new_school_type, new_school_admin_id, new_school_classes, new_school_houses } = data;
  if (!name || !username || !email || !password || !new_school_name || !new_school_type || !new_school_admin_id) {
    return { success: false, error: "Missing required fields for school onboarding" };
  }

  const membersSheet = getSheet("members");
  const schoolsSheet = getSheet("schools");
  const headers = getHeaders(membersSheet);
  const sHeaders = getHeaders(schoolsSheet);
  
  // Check if email exists
  const rows = membersSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf("email")].toLowerCase() === email.toLowerCase()) {
      return { success: false, error: "Email already registered" };
    }
  }

  const newId = Utilities.getUuid();
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  const newSchoolId = Utilities.getUuid();
  const schoolRowObj = {
     id: newSchoolId,
     name: new_school_name,
     motto: new_school_motto || "",
     colours: JSON.stringify(new_school_colours || []),
     cheque_representation: new_school_cheque_representation || "N/A",
     type: new_school_type,
     classes: JSON.stringify(new_school_classes || []),
     houses: JSON.stringify(new_school_houses || []),
     status: "Pending",
     admin_id: newId
  };
  schoolsSheet.appendRow(sHeaders.map(h => schoolRowObj[h] !== undefined ? schoolRowObj[h] : ""));

  const newRowObj = {
    id: newId,
    name: name,
    username: username,
    email: email.toLowerCase(),
    password: password, // In prod, hash this
    role: "School Administrator", // Pending Super Admin
    year_group_id: "PENDING",
    year_group_nickname: "PENDING",
    final_class: "",
    house_name: "",
    gender: "",
    cheque_colour: "#1E293B",
    school: newSchoolId,
    association: "Pending Verification",
    date_joined: new Date().toISOString(),
    session_token: token,
    token_expiry: expiry.toISOString(),
    school_admin_id: new_school_admin_id,
    verification_status: "Approved", // Auto-approved for MVP
    // Privacy defaults
    priv_email: "all", // Admins usually public
    priv_phone: "all",
    priv_location: "all",
    priv_profession: "all",
    priv_linkedin: "all",
    priv_bio: "all",
    bio: `School Administrator (Pending Verification)`,
    profession: "",
    location: "",
    phone: "",
    linkedin: ""
  };

  const newRowArray = headers.map(h => newRowObj[h] !== undefined ? newRowObj[h] : "");
  membersSheet.appendRow(newRowArray);
  
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

// ==========================================
// Role Hierarchy & Governance
// ==========================================

const ROLE_TIERS = {
  "IT Department": 3,
  "Platform Super Admin": 3,
  "School Administrator": 2, // School Super Admin
  "YG President": 1,         // YG Super Admin
  "YG Vice President": 1,
  "YG Gen. Secretary": 1,
  "YG Organiser": 1,
  "YG Finance Executive": 1,
  "Member": 0
};

function enforceRoleHierarchy(actingUser, targetRole, allowedTiers) {
  const actorTier = ROLE_TIERS[actingUser.role] || 0;
  
  if (allowedTiers && !allowedTiers.includes(actorTier)) {
     throw new Error("Forbidden: Insufficient tier permissions for this action");
  }

  // A user cannot appoint or modify a role equal to or higher than their own tier
  // Exception: Tier 3 can modify Tier 3 internally, but usually handled in master panel
  const targetTier = ROLE_TIERS[targetRole] || 0;
  
  if (actorTier <= targetTier && actorTier !== 3) {
     throw new Error(`Forbidden: A ${actingUser.role} cannot appoint or modify a ${targetRole}.`);
  }
  
  return true;
}

function assignTargetRole(user, data) {
  const { target_user_id, new_role } = data;
  if (!target_user_id || !new_role) return { success: false, error: "Missing fields" };

  // Validate the assigner has the right to appoint this specific role
  try {
     enforceRoleHierarchy(user, new_role);
  } catch (err) {
     return { success: false, error: err.message };
  }

  const sheet = getSheet("members");
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    let rowObj = rowToObject(rows[i], headers);
    if (rowObj.id === target_user_id) {
       // Scope validation
       if (ROLE_TIERS[user.role] === 1 && rowObj.year_group_id !== user.year_group_id) {
           return { success: false, error: "A YG Admin can only assign roles within their own year group." };
       }
       if (ROLE_TIERS[user.role] === 2 && rowObj.school !== user.school) {
           return { success: false, error: "A School Admin can only assign roles within their own school." };
       }

       // Perform assignment
       sheet.getRange(i + 1, headers.indexOf("role") + 1).setValue(new_role);
       return { success: true, message: `Role successfully updated to ${new_role}` };
    }
  }

  return { success: false, error: "Target member not found" };
}

// ==========================================
// Dashboard & Profile
// ==========================================

function getDashboard(user) {
  const userSchool = user.school || "Aggrey Memorial";
  
  // Assemble basic stats
  const ygs = getSheetData("members").filter(m => (m.school || "Aggrey Memorial") === userSchool && m.year_group_id === user.year_group_id);
  const posts = getSheetData("posts").filter(p => (p.school || "Aggrey Memorial") === userSchool && p.year_group_id === user.year_group_id && p.status === "Approved");
  const activeCampaigns = getSheetData("campaigns").filter(c => (c.school || "Aggrey Memorial") === userSchool && c.status === "active" && (c.scope === "school" || (c.scope === "yeargroup" && c.year_group_id === user.year_group_id)));
  
  const upcomingEvents = getSheetData("events").filter(e => {
     if ((e.school || "Aggrey Memorial") !== userSchool) return false;
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
  const allowedFields = ["name", "username", "bio", "profession", "location", "phone", "linkedin", 
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
    const memberSchool = member.school || "Aggrey Memorial";
    const userSchool = user.school || "Aggrey Memorial";
    
    // HARD TENANT ISOLATION: A user cannot see members of another school unless Platform Admin
    const viewerTier = ROLE_TIERS[user.role] || 0;
    if (memberSchool !== userSchool && viewerTier < 3) continue;

    if (scope === "yeargroup" && member.year_group_id !== user.year_group_id) continue;
    if (scope === "school" && memberSchool !== userSchool) continue;
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
  // Super Admins see all
  const viewerTier = ROLE_TIERS[viewerUser.role] || 0;
  if (viewerTier === 3 || targetMember.id === viewerUser.id) {
     return targetMember; 
  }

  // School Admins see all within their own school
  if (viewerTier === 2 && targetMember.school === viewerUser.school) {
     return targetMember;
  }

  let safeTarget = { ...targetMember };
  delete safeTarget.password;
  delete safeTarget.session_token;
  delete safeTarget.token_expiry;
  delete safeTarget.verification_status;
  delete safeTarget.school_admin_id;

  // Determine relationship distance
  let relationship = "all";
  if (targetMember.school === viewerUser.school) {
     relationship = "school";
     if (targetMember.year_group_id === viewerUser.year_group_id) {
         relationship = "yeargroup";
     }
  }
  
  const privFields = ["email", "phone", "location", "profession", "linkedin", "bio"];
  
  privFields.forEach(field => {
    let setting = safeTarget["priv_" + field] || "hidden";
    
    if (setting === "hidden") {
      delete safeTarget[field];
    } else if (setting === "yeargroup" && relationship !== "yeargroup") {
       // Only visible to own year group (or superiors, already caught above)
       delete safeTarget[field];
    } else if (setting === "school" && relationship !== "yeargroup" && relationship !== "school") {
       // Only visible to own school
       delete safeTarget[field];
    }
    // if 'all', it's visible to logged in users across the platform. So keep it.
  });

  return safeTarget;
}


// ==========================================
// Newsletter & Posts
// ==========================================

function getPosts(user, data) {
  const userSchool = user.school || "Aggrey Memorial";
  const allPosts = getSheetData("posts").filter(p => (p.school || "Aggrey Memorial") === userSchool); // P0: Tenant Isolation
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
    school: user.school, // P0: Tenant Isolation
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
           let year = d.getFullYear();
           let month = d.getMonth() + 1;
           let proposedMonth = year + "-" + String(month).padStart(2,'0');
           
           // Check if this month is already dispatched
           const nlSheet = getSheet("newsletters");
           const nlHeaders = getHeaders(nlSheet);
           const nlRows = nlSheet.getDataRange().getValues();
           let isDispatched = false;
           for(let j=1; j<nlRows.length; j++) {
               let nlRow = rowToObject(nlRows[j], nlHeaders);
               if(nlRow.year_group_id === row.year_group_id && nlRow.month === proposedMonth) {
                   isDispatched = true;
                   break;
               }
           }
           
           // If dispatched, queue for next month
           if (isDispatched) {
               month++;
               if (month > 12) {
                  month = 1;
                  year++;
               }
               proposedMonth = year + "-" + String(month).padStart(2,'0');
           }
           
           nMonth = proposedMonth;
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

function dispatchNewsletter(user, data) {
  if (!user.role || ROLE_TIERS[user.role] < 1) {
      return { success: false, error: "Unauthorized: Dispatches require Year Group Admin or higher scope." };
  }

  const d = new Date();
  const currentMonth = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0');
  
  // 1. Get Approved posts for the current month in this YG
  const postSheet = getSheet("posts");
  const pHeaders = getHeaders(postSheet);
  const pRows = postSheet.getDataRange().getValues();
  
  let approvedPosts = [];
  let postIds = [];
  
  for(let i=1; i<pRows.length; i++) {
     let row = rowToObject(pRows[i], pHeaders);
     if (row.year_group_id === user.year_group_id && row.status === "Approved" && row.newsletter_month === currentMonth) {
        approvedPosts.push({ ...row, rowIndex: i + 1 });
        postIds.push(row.id);
     }
  }

  if (approvedPosts.length === 0) {
      return { success: false, error: "No approved posts available to dispatch for " + currentMonth };
  }

  // 2. Get all members of the Year Group
  const memberRows = getSheetData("members");
  const recipients = memberRows
     .filter(m => m.year_group_id === user.year_group_id && m.email)
     .map(m => m.email);

  if (recipients.length === 0) {
      return { success: false, error: "No members found to receive the newsletter." };
  }

  // 3. Build HTML Email
  let emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${user.cheque_colour || '#1E293B'}; color: white; padding: 20px; text-align: center;">
         <h1 style="margin: 0; font-size: 24px;">Class of ${user.year_group_nickname || ''} Updates</h1>
         <p style="margin: 5px 0 0 0; opacity: 0.9;">${user.school} - ${currentMonth}</p>
      </div>
      <div style="padding: 20px;">
        <p>Hello,</p>
        <p>Here are the latest updates from your year group:</p>
  `;

  approvedPosts.forEach(post => {
      emailHtml += `
         <div style="margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 5px 0; color: #1e293b;">${post.title}</h3>
            <span style="display: inline-block; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${post.category}</span>
            <span style="font-size: 13px; color: #64748b; margin-left: 10px;">By ${post.author_name}</span>
            <p style="color: #334155; line-height: 1.6; white-space: pre-wrap;">${post.content}</p>
         </div>
      `;
  });

  emailHtml += `
      </div>
      <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
         Sent via OSA Network - ICUNI Labs
      </div>
    </div>
  `;

  // 4. Send Emails via MailApp (BCC to save quota / keep private)
  try {
     MailApp.sendEmail({
        to: user.email, // Send one to executor
        bcc: recipients.join(","),
        subject: `[${user.school}] Class of ${user.year_group_nickname || ''} Newsletter - ${currentMonth}`,
        htmlBody: emailHtml,
        name: "OSA Platform"
     });
  } catch (e) {
     return { success: false, error: "MailApp Error: " + e.message };
  }

  // 5. Update Status to Published
  approvedPosts.forEach(post => {
      postSheet.getRange(post.rowIndex, pHeaders.indexOf("status") + 1).setValue("Published");
  });

  // 6. Log Newsletter Record
  const nlSheet = getSheet("newsletters");
  nlSheet.appendRow([
      Utilities.getUuid(),
      currentMonth,
      user.year_group_id,
      JSON.stringify(postIds),
      recipients.length,
      user.id,
      new Date().toISOString()
  ]);

  return { success: true, message: `Newsletter dispatched successfully to ${recipients.length} members.` };
}

// ==========================================
// Fundraising
// ==========================================

function getCampaigns(user, data) {
  const scopeFilter = data.scope || "all"; // my_school, all
  const userSchool = user.school || "Aggrey Memorial";
  
  const allCampaigns = getSheetData("campaigns").filter(c => (c.school || "Aggrey Memorial") === userSchool); // P0: Tenant Isolation
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
  const userSchool = user.school || "Aggrey Memorial";
  
  const events = getSheetData("events").filter(e => (e.school || "Aggrey Memorial") === userSchool); // P0: Tenant Isolation
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
    const userSchool = user.school || "Aggrey Memorial";
    const albums = getSheetData("albums").filter(a => (a.school || "Aggrey Memorial") === userSchool && a.group_id === data.group_id); // P0: Tenant Isolation
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
        if(h==="school") return user.school; // P0: Tenant Isolation
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
    const userSchool = user.school || "Aggrey Memorial";
    let images = getSheetData("galleries").filter(g => (g.school || "Aggrey Memorial") === userSchool && g.group_id === data.group_id); // P0: Tenant Isolation
    if (data.album_id) {
        images = images.filter(g => g.album_id === data.album_id);
    }
    return { success: true, data: images.reverse() };
}

function getBoardMessages(user, data) {
    const group_id = data.group_id || user.year_group_id;
    const userSchool = user.school || "Aggrey Memorial";
    let msgs = getSheetData("board_messages").filter(m => (m.school || "Aggrey Memorial") === userSchool && m.group_id === group_id); // P0: Tenant Isolation
    
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
        if(h==="school") return user.school; // P0: Tenant Isolation
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
        "schools": ["id", "name", "motto", "colours", "cheque_representation", "type", "classes", "houses", "status", "admin_id"],
        "year_groups": ["id", "school", "year", "nickname", "house_name", "cheque_colour"],
        "members": ["id", "name", "username", "email", "password", "role", "year_group_id", "year_group_nickname", "final_class", "house_name", "gender", "cheque_colour", "school", "association", "date_joined", "session_token", "token_expiry", "priv_email", "priv_phone", "priv_location", "priv_profession", "priv_linkedin", "priv_bio", "bio", "profession", "location", "phone", "linkedin", "profile_pic", "school_admin_id", "verification_status"],
        "posts": ["id", "title", "category", "content", "author_id", "author_name", "year_group_id", "school", "submission_date", "status", "newsletter_month", "rejection_note"],
        "campaigns": ["id", "title", "type", "description", "target_amount", "currency", "deadline", "scope", "year_group_id", "school", "status", "raised_amount", "donor_count", "updates", "created_by"],
        "donations": ["id", "campaign_id", "donor_id", "amount", "timestamp", "payment_method"],
        "events": ["id", "title", "type", "description", "date", "time", "virtual_link", "venue", "scope", "year_group_id", "school", "max_attendees", "status", "created_by"],
        "rsvps": ["id", "event_id", "user_id", "timestamp"],
        "newsletters": ["id", "month", "year_group_id", "post_ids", "recipient_count", "dispatched_by", "timestamp"],
        "board_messages": ["id", "group_id", "school", "author_id", "author_name", "content", "comments", "reactions", "timestamp"],
        "albums": ["id", "group_id", "school", "name", "description", "created_by_id", "created_by_name", "timestamp"],
        "galleries": ["id", "group_id", "school", "album_id", "uploaded_by_id", "uploaded_by_name", "url", "timestamp"]
    };

    for (let s in sheetsToCreate) {
        let sheet = ss.getSheetByName(s);
        if (!sheet) {
            sheet = ss.insertSheet(s);
            sheet.appendRow(sheetsToCreate[s]);
            
            // Auditor Hotfix: Seed Initial Year Group
            if (s === "year_groups") {
                sheet.appendRow(["yg-2012", "Aggrey Memorial", "2012", "The Pioneers", "Aggrey House", "#22c55e"]);
            }
        } else {
            // Schema Migration: Check if the sheet is missing new headers
            const expectedHeaders = sheetsToCreate[s];
            const lastCol = sheet.getLastColumn() || 1;
            const currentHeadersRange = sheet.getRange(1, 1, 1, lastCol);
            const currentHeaders = currentHeadersRange.getValues()[0].map(h => String(h).toLowerCase().replace(/\s+/g, '_'));
            
            if (currentHeaders.length > 0 && currentHeaders[0] !== "") {
                let missingHeaders = expectedHeaders.filter(h => !currentHeaders.includes(h.toLowerCase().replace(/\s+/g, '_')));
                if (missingHeaders.length > 0) {
                    for (let i = 0; i < missingHeaders.length; i++) {
                        sheet.getRange(1, lastCol + 1 + i).setValue(missingHeaders[i]);
                    }
                }
            } else {
                sheet.appendRow(expectedHeaders);
            }
        }
    }
}
