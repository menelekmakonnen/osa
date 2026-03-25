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

// ==========================================
// CORE INFRASTRUCTURE: MULTI-SHEET ROUTING & SECURITY
// ==========================================

let CURRENT_SCHOOL_ID = "ICUNI_LABS"; // Execution-scoped global state

const MASTER_DB_ID = "1mXY-MoxvTiUcDOtOYkDoG2PtaE2-aN0JpvpCrDA2Jcc";
const MASTER_FOLDER_ID = "1rqI7YHf7Z1pvSkUVgbx2d_Uj4JZbPpFO";

/**
 * SHA-256 Password Hashing Helper
 */
function hashPassword(password) {
  const salt = "ICUNI_OSA_SALT_2026";
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt);
  return signature.map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

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
  } else if (action === "resendVerificationEmail") {
    return handleResendVerification(data);
  } else if (action === "verifyEmail") {
    return handleVerifyEmail(data);
  } else if (action === "sync_schema") {
    INITIALIZE_SHEETS();
    return { success: true, message: "Schema migrated successfully" };
  } else if (action === "seedICUNIControl") {
    return seedICUNIControl();
  } else if (action === "force_reset_db") {
    const ss = getMasterDB();
    const sheets = ss.getSheets();
    const temp = ss.insertSheet("WIPING");
    sheets.forEach(sh => {
        try { ss.deleteSheet(sh); } catch(e) {}
    });
    INITIALIZE_SHEETS(ss);
    ss.deleteSheet(temp);
    return { success: true, message: "Master DB Scrubbed & Rebuilt for Architecture V3" };
  } else if (action === "unblock_auditor") {
    const ms = getSheet("members", CURRENT_SCHOOL_ID);
    const hs = getHeaders(ms);
    const rows = ms.getDataRange().getValues();
    let count = 0;
    for(let i=1; i<rows.length; i++) {
        let row = rowToObject(rows[i], hs);
        if(row.verification_status === "Pending" || row.role.includes("Pending") || row.year_group_id === "PENDING") {
            ms.getRange(i+1, hs.indexOf("verification_status")+1).setValue("Approved");
            
            // If they were stuck as pending school admins
            if(row.role.includes("Pending") || row.role.includes("School Administrator")) {
                 ms.getRange(i+1, hs.indexOf("role")+1).setValue("School Administrator");
            }
            count++;
        }
    }
    
    // Also approve schools
    const ss = getSheet("schools", CURRENT_SCHOOL_ID);
    const s_hs = getHeaders(ss);
    const s_rows = ss.getDataRange().getValues();
    let scount = 0;
    for(let j=1; j<s_rows.length; j++) {
        let srow = rowToObject(s_rows[j], s_hs);
        if(srow.status === "Pending") {
           ss.getRange(j+1, s_hs.indexOf("status")+1).setValue("Approved");
           scount++;
        }
    }
    return { success: true, message: `Unblocked ${count} members and ${scount} schools.` };
  } else if (action === "getSchools") {
      let schools = getSheetData("schools", CURRENT_SCHOOL_ID);
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
         houses: s.houses,
         status: s.status
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

  // Set Global Routing State for this execution thread
  if ((user.role === "IT Department" || user.role === "ICUNI Staff") && data && data.target_school_id) {
    CURRENT_SCHOOL_ID = data.target_school_id;
  } else if (user.school) {
    CURRENT_SCHOOL_ID = user.school;
  }

    // Protected actions
  switch (action) {
    case "getDashboard":
      return getDashboard(user, data);
    case "getProfile":
      return getProfile(user);
    case "updateProfile":
      return updateProfile(user, data);
    case "assignRole":
      return assignTargetRole(user, data);
    case "getMembers":
      return getMembers(user, data);
    case "changePassword":
      return changePassword(user, data);
      
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
      enforceRoleHierarchy(user, "Member", [1, 2, 3, 4, 5]); // Must be at least Tier 1 (YG Exec)
      return updatePostStatus(user, action, data);
    case "dispatchNewsletter":
      enforceRoleHierarchy(user, "Member", [1, 2, 3, 4, 5]); // Must be at least Tier 1
      return dispatchNewsletter(user, data);

    // Fundraising
    case "getCampaigns":
      return getCampaigns(user, data);
    case "createCampaign":
      enforceRoleHierarchy(user, "Member", [1, 2, 3, 4, 5]);
      return createCampaign(user, data);
    case "donate":
      return handleDonation(user, data);

    // Events
    case "getEvents":
      return getEvents(user, data);
    case "createEvent":
      enforceRoleHierarchy(user, "Member", [1, 2, 3, 4, 5]);
      return createEvent(user, data);
    case "rsvp":
      return rsvpToEvent(user, data);
      
    // Admin
    case "getAdminData":
      enforceRoleHierarchy(user, "Member", [1, 2, 3, 4, 5]);
      return getAdminData(user);
    case "fixPendingAccounts":
      const mSheet = getSheet("members", CURRENT_SCHOOL_ID);
      const mHeaders = getHeaders(mSheet);
      const mRows = mSheet.getDataRange().getValues();
      let patched = 0;
      for (let i = 1; i < mRows.length; i++) {
         if (mRows[i][mHeaders.indexOf("year_group_nickname")] === "PENDING") {
           mSheet.getRange(i+1, mHeaders.indexOf("year_group_id")+1).setValue("ADMIN");
           mSheet.getRange(i+1, mHeaders.indexOf("year_group_nickname")+1).setValue("School Executives");
           patched++;
         }
      }
      return { success: true, count: patched };
    case "seedTestAccount":
      return seedTestAccount(user, data);
    case "migrateImages":
      return migrateImages(user, data);

    // Group Settings
    case "getGroupSettings":
      return getGroupSettings(user, data);
    case "saveGroupSettings":
      return saveGroupSettings(user, data);
    case "updateGroupAvatar":
      return updateGroupAvatar(user, data);

    // Tech Support
    case "getTickets":
      return getTickets(user, data);
    case "submitTicket":
      return submitTicket(user, data);
    case "escalateTicket":
      return escalateTicket(user, data);
    case "resolveTicket":
      return resolveTicket(user, data);

    // ICUNI Labs Cockpit
    case "getSystemOverview":
      return getSystemOverview(user);
    case "getStaffRoster":
      return getStaffRoster(user);
    case "addStaffMember":
      return addStaffMember(user, data);
    case "removeStaffMember":
      return removeStaffMember(user, data);
    case "removeSchool":
      return removeSchool(user, data);
    case "getSheetDataRaw":
      return getSheetDataRaw(user, data);
    case "updateSheetCell":
      return updateSheetCell(user, data);
    case "overrideMember":
      return overrideMember(user, data);
    case "saveFeatureFlags":
      return saveFeatureFlags(user, data);
    case "getFeatureFlags":
      return getFeatureFlags(user);

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
  
  const hash = hashPassword(password);
  const masterSS = getMasterDB();
  const mSheet = masterSS.getSheetByName("staff");
  const headers = getHeaders(mSheet);
  const rows = mSheet.getDataRange().getValues();
  
  // 1. Check Master Form (Staff & Central Users)
  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (String(rowObj.email).toLowerCase() === String(email).toLowerCase()) {
      if (rowObj.password === hash || rowObj.password === password) {
        return buildLoginSuccess(mSheet, i + 1, headers, rowObj);
      } else {
        return { success: false, error: "Invalid email or password." };
      }
    }
  }

  // 2. Iterate Schools
  const sSheet = masterSS.getSheetByName("schools");
  const sHeaders = getHeaders(sSheet);
  const sRows = sSheet.getDataRange().getValues();
  for(let j=1; j<sRows.length; j++){
      let sRow = rowToObject(sRows[j], sHeaders);
      if(!sRow.spreadsheet_id) continue;
      try {
         const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
         const schoolMSheet = schoolSS.getSheetByName("members");
         if(!schoolMSheet) continue;
         let smHeaders = getHeaders(schoolMSheet);
         let smRows = schoolMSheet.getDataRange().getValues();
         for(let k=1; k<smRows.length; k++){
            let uRow = rowToObject(smRows[k], smHeaders);
            if(String(uRow.email).toLowerCase() === String(email).toLowerCase()) {
               if(uRow.password === hash || uRow.password === password) {
                  return buildLoginSuccess(schoolMSheet, k + 1, smHeaders, uRow);
               } else {
                  return { success: false, error: "Invalid email or password" };
               }
            }
         }
      } catch(e) {}
  }
  return { success: false, error: "Invalid email or password" };
}

function buildLoginSuccess(sheet, rowIndex, headers, rowObj) {
    const token = Utilities.getUuid();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    sheet.getRange(rowIndex, headers.indexOf("session_token") + 1).setValue(token);
    sheet.getRange(rowIndex, headers.indexOf("token_expiry") + 1).setValue(expiry.toISOString());
    delete rowObj.password;
    delete rowObj.session_token;
    return { success: true, data: { token: token, user: rowObj } };
}
function handleRegister(data) {
  const { name, username, email, password, year_group_id, school_id, new_yg_year, new_yg_nickname, final_class, house_name, gender } = data;
  if (!name || !username || !email || !password || (!year_group_id && !new_yg_year) || !school_id) {
    return { success: false, error: "Missing required fields" };
  }

  const membersSheet = getSheet("members", CURRENT_SCHOOL_ID);
  const headers = getHeaders(membersSheet);
  
  // Check if email exists
  const rows = membersSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf("email")].toLowerCase() === email.toLowerCase()) {
      return { success: false, error: "Email already registered" };
    }
  }

  // Get year group details to attach correct cheque color
  const ygSheet = getSheet("year_groups", CURRENT_SCHOOL_ID);
  const ygHeaders = getHeaders(ygSheet);
  const ygRows = ygSheet.getDataRange().getValues();
  let cheque_color = "#1E293B"; // Default slate
  let yg_nickname = "";
  let assoc = "AMOSA";

  let actual_yg_id = year_group_id;

  if (year_group_id === "new_yg" && new_yg_year && new_yg_nickname) {
     actual_yg_id = Utilities.getUuid();
     yg_nickname = new_yg_nickname;
     
     let generatedYgFolderId = "";

     // Create Drive Folder Architecture for this Year Group FIRST
     try {
       const masterSS = getMasterDB();
       const schoolsRegistry = masterSS.getSheetByName("schools");
       const shHeaders = getHeaders(schoolsRegistry);
       const shRows = schoolsRegistry.getDataRange().getValues();
       let schoolDriveFolderId = null;
       for (let i = 1; i < shRows.length; i++) {
         let sRow = rowToObject(shRows[i], shHeaders);
         if (sRow.id === school_id) {
            schoolDriveFolderId = sRow.drive_folder_id;
            break;
         }
       }

       if (schoolDriveFolderId) {
         const schoolFolder = DriveApp.getFolderById(schoolDriveFolderId);
         let ygBaseFolder;
         const ygBaseIter = schoolFolder.getFoldersByName("Year Groups");
         if(ygBaseIter.hasNext()) ygBaseFolder = ygBaseIter.next();
         else ygBaseFolder = schoolFolder.createFolder("Year Groups");

         const newYGFolder = ygBaseFolder.createFolder(new_yg_year + " - " + new_yg_nickname);
         generatedYgFolderId = newYGFolder.getId();
         const ygsaF = newYGFolder.createFolder("Year Group Super Admins");
         ygsaF.createFolder("Deleted");

         const ygmF = newYGFolder.createFolder("Year Group Members");
         ygmF.createFolder("Deleted");

         const ygaF = newYGFolder.createFolder("Year Group Admins");
         ygaF.createFolder("Deleted");

         newYGFolder.createFolder("Year Group Gallery");
         newYGFolder.createFolder("Year Group Events");
         newYGFolder.createFolder("Year Group Posts");
         newYGFolder.createFolder("Donations");

         // Club Supergroup Architecture container
         const clubsFolder = newYGFolder.createFolder("Clubs");
         // Subfolders for specific clubs (e.g., "Science Club -> Admins/Members/Gallery") 
         // will be generated within this container when a specific club is registered.
       }
     } catch (e) {
       console.error("Failed to build Year Group Drive Architecture: ", e);
     }

     // Create the new year group dynamically in DB
     ygSheet.appendRow([actual_yg_id, school_id, new_yg_year, new_yg_nickname, "", cheque_color, "", generatedYgFolderId]);

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
    password: hashPassword(password),
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
    priv_social: "yeargroup",
    bio: "",
    profession: "",
    location: "",
    phone: "",
    linkedin: "",
    social_links: "{}",
    cover_url: ""
  };

  const newRowArray = headers.map(h => newRowObj[h] !== undefined ? newRowObj[h] : "");
  membersSheet.appendRow(newRowArray);
  const newRowIndex = membersSheet.getLastRow();
  
  // --- Create Member Personal Drive Folder ---
  try {
      const masterFolder = DriveApp.getFolderById(MASTER_FOLDER_ID);
      let memberFolder = null;
      const userRole = newRowObj.role || "Member";

      if (userRole === "IT Department") {
          let staffBase;
          const staffIter = masterFolder.getFoldersByName("Staff");
          if(staffIter.hasNext()) staffBase = staffIter.next();
          else staffBase = masterFolder.createFolder("Staff");
          memberFolder = staffBase.createFolder(newRowObj.name + " [" + newId.substring(0,8) + "]");
      } else {
          // Normal Member: Locate their Year Group's "Year Group Members" folder
          let ygFolderId = null;
          if (year_group_id === "new_yg" && typeof generatedYgFolderId !== "undefined" && generatedYgFolderId) {
             ygFolderId = generatedYgFolderId;
          } else {
             const ygSheet = getSheet("year_groups", CURRENT_SCHOOL_ID);
             const yHeaders = getHeaders(ygSheet);
             const yRows = ygSheet.getDataRange().getValues();
             for (let i = 1; i < yRows.length; i++) {
                let yRow = rowToObject(yRows[i], yHeaders);
                if (yRow.id === actual_yg_id) {
                   ygFolderId = yRow.drive_folder_id;
                   break;
                }
             }
          }

          if (ygFolderId) {
             const ygFolder = DriveApp.getFolderById(ygFolderId);
             let membersContainer;
             const memIter = ygFolder.getFoldersByName("Year Group Members");
             if (memIter.hasNext()) membersContainer = memIter.next();
             else membersContainer = ygFolder.createFolder("Year Group Members");

             memberFolder = membersContainer.createFolder(newRowObj.name + " [" + newId.substring(0,8) + "]");
          }
      }

      if (memberFolder) {
          membersSheet.getRange(newRowIndex, headers.indexOf("drive_folder_id") + 1).setValue(memberFolder.getId());
      }
  } catch (e) {
      console.error("Failed to generate Member Drive folder: ", e);
  }
  
  // Return user obj without secrets
  delete newRowObj.password;
  delete newRowObj.session_token;

  // Dispatch Verification Email
  try {
    sendVerificationEmail(membersSheet, headers, newRowIndex, newRowObj.email, newRowObj.name);
  } catch (e) {
    console.error("Failed to dispatch verification: ", e);
  }
  
  return {
    success: true,
    data: {
      token: token,
      user: newRowObj
    }
  };
}

function changePassword(user, data) {
  const { old_password, new_password, confirm_password } = data;
  if (!old_password || !new_password || !confirm_password) return { success: false, error: "Missing fields" };
  if (new_password !== confirm_password) return { success: false, error: "Passwords do not match" };

  const membersSheet = getSheet("members", CURRENT_SCHOOL_ID);
  const headers = getHeaders(membersSheet);
  const rows = membersSheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.id === user.id) {
      if (rowObj.password !== hashPassword(old_password) && rowObj.password !== old_password) {
         return { success: false, error: "Incorrect old password" };
      }
      membersSheet.getRange(i + 1, headers.indexOf("password") + 1).setValue(hashPassword(new_password));
      return { success: true, message: "Password updated successfully" };
    }
  }
  return { success: false, error: "User not found in database" };
}

function handleOnboardSchool(data) {
  const { name, username, email, password, new_school_name, new_association_name, new_association_short_name, new_school_motto, new_school_colours, new_school_cheque_representation, new_school_type, new_school_admin_id, new_school_classes, new_school_houses } = data;
  if (!name || !username || !email || !password || !new_school_name || !new_school_type || !new_school_admin_id) {
    return { success: false, error: "Missing required fields for school onboarding" };
  }

  const masterSS = getMasterDB();
  const membersSheet = masterSS.getSheetByName("staff");
  const schoolsSheet = masterSS.getSheetByName("schools");
  const headers = getHeaders(membersSheet);
  const sHeaders = getHeaders(schoolsSheet);
  
  // Check if email exists in Master
  const rows = membersSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf("email")].toLowerCase() === email.toLowerCase()) {
      return { success: false, error: "Email already registered in Master" };
    }
  }

  const newId = Utilities.getUuid();
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  const newSchoolId = Utilities.getUuid();

  // 1. Build Google Drive Folder Architecture
  const masterFolder = DriveApp.getFolderById(MASTER_FOLDER_ID);
  let schoolsBaseFolder;
  const schoolsIter = masterFolder.getFoldersByName("Schools");
  if(schoolsIter.hasNext()) {
    schoolsBaseFolder = schoolsIter.next();
  } else {
    schoolsBaseFolder = masterFolder.createFolder("Schools");
  }

  const schoolFolder = schoolsBaseFolder.createFolder(new_school_name + " [" + newSchoolId.substring(0,8) + "]");
  schoolFolder.createFolder("School_Info");
  const adminsF = schoolFolder.createFolder("Admins");
  
  // Create the initial admin folder as per architectural plan
  adminsF.createFolder(name + " [" + newId.substring(0,8) + "]");
  
  schoolFolder.createFolder("Year Groups");
  schoolFolder.createFolder("Donations");

  // 2. Generate Standalone School Spreadsheet
  const newSS = SpreadsheetApp.create(new_school_name + " Database");
  const ssId = newSS.getId();
  DriveApp.getFileById(ssId).moveTo(schoolFolder); // Move to School Folder
  
  // 3. Initialize Schema on the new School DB
  INITIALIZE_SHEETS(newSS);

  // 4. Save to Master Registry
  const schoolRowObj = {
     id: newSchoolId,
     name: new_school_name,
     association_name: new_association_name || "",
     association_short_name: new_association_short_name || "",
     motto: new_school_motto || "",
     colours: JSON.stringify(new_school_colours || []),
     cheque_representation: new_school_cheque_representation || "N/A",
     type: new_school_type,
     classes: JSON.stringify(new_school_classes || []),
     houses: JSON.stringify(new_school_houses || []),
     status: "Approved", // Auto-approved
     admin_id: newId,
     spreadsheet_id: ssId,
     drive_folder_id: schoolFolder.getId()
  };
  schoolsSheet.appendRow(sHeaders.map(h => schoolRowObj[h] !== undefined ? schoolRowObj[h] : ""));

  // 5. Save Admin User to the NEW School DB
  const schoolMembersSheet = newSS.getSheetByName("members");
  const newRowObj = {
    id: newId,
    name: name,
    username: username,
    email: email.toLowerCase(),
    password: hashPassword(password),
    role: "School Administrator", // Pending Super Admin
    year_group_id: "ADMIN",
    year_group_nickname: "School Executives",
    final_class: "",
    house_name: "",
    gender: "",
    cheque_colour: "#1E293B",
    school: newSchoolId,
    association: new_school_name,
    date_joined: new Date().toISOString(),
    session_token: token,
    token_expiry: expiry.toISOString(),
    school_admin_id: new_school_admin_id,
    verification_status: "Approved", // Auto-approved
    priv_email: "all",
    priv_phone: "all",
    priv_location: "all",
    priv_profession: "all",
    priv_linkedin: "all",
    priv_bio: "all",
    priv_social: "all",
    bio: "School Administrator (Approved)",
    profession: "",
    location: "",
    phone: "",
    linkedin: "",
    social_links: "{}",
    cover_url: ""
  };

  const smHeaders = getHeaders(schoolMembersSheet);
  const newRowArray = smHeaders.map(h => newRowObj[h] !== undefined ? newRowObj[h] : "");
  schoolMembersSheet.appendRow(newRowArray);
  const newRowIndex = schoolMembersSheet.getLastRow();
  
  delete newRowObj.password;
  delete newRowObj.session_token;

  // Dispatch Verification Email
  try {
    sendVerificationEmail(membersSheet, headers, newRowIndex, newRowObj.email, newRowObj.name);
  } catch (e) {
    console.error("Failed to dispatch verification: ", e);
  }
  
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

function handleResendVerification(data) {
  const { email } = data;
  if (!email) return { success: false, error: "Missing email address" };

  const membersSheet = getSheet("members", CURRENT_SCHOOL_ID);
  const headers = getHeaders(membersSheet);
  const rows = membersSheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.email && rowObj.email.toLowerCase() === email.toLowerCase()) {
      try {
        sendVerificationEmail(membersSheet, headers, i + 1, rowObj.email, rowObj.name);
        return { success: true, message: "Verification email sent to " + email };
      } catch (e) {
        console.error("Failed to send verification email: ", e);
        return { success: false, error: "Failed to send verification email. Please try again later." };
      }
    }
  }

  return { success: false, error: "Email address not found" };
}

function handleVerifyEmail(data) {
  const { token } = data;
  if (!token) return { success: false, error: "Missing verification token" };

  const membersSheet = getSheet("members", CURRENT_SCHOOL_ID);
  const headers = getHeaders(membersSheet);
  const rows = membersSheet.getDataRange().getValues();

  // Ensure email_verified column exists
  let evCol = headers.indexOf("email_verified");
  if (evCol === -1) {
    membersSheet.getRange(1, headers.length + 1).setValue("email_verified");
    headers.push("email_verified");
    evCol = headers.length - 1;
  }
  let vtCol = headers.indexOf("verification_token");
  if (vtCol === -1) {
    membersSheet.getRange(1, headers.length + 1).setValue("verification_token");
    headers.push("verification_token");
    vtCol = headers.length - 1;
  }

  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.verification_token && rowObj.verification_token === token) {
      // Mark email as verified
      membersSheet.getRange(i + 1, evCol + 1).setValue("true");
      // Clear the token so it can't be reused
      membersSheet.getRange(i + 1, vtCol + 1).setValue("");

      // Return updated user for frontend session refresh
      delete rowObj.password;
      delete rowObj.session_token;
      rowObj.email_verified = true;
      return { success: true, data: rowObj };
    }
  }

  return { success: false, error: "Invalid or expired verification link" };
}

function sendVerificationEmail(sheet, headers, rowIndex, recipientEmail, userName) {
  // Generate a secure token and store it
  const verifyToken = Utilities.getUuid();

  // Ensure verification_token column exists
  let vtCol = headers.indexOf("verification_token");
  if (vtCol === -1) {
    sheet.getRange(1, headers.length + 1).setValue("verification_token");
    headers.push("verification_token");
    vtCol = headers.length - 1;
  }
  // Ensure email_verified column exists
  let evCol = headers.indexOf("email_verified");
  if (evCol === -1) {
    sheet.getRange(1, headers.length + 1).setValue("email_verified");
    headers.push("email_verified");
    evCol = headers.length - 1;
  }

  sheet.getRange(rowIndex, vtCol + 1).setValue(verifyToken);
  sheet.getRange(rowIndex, evCol + 1).setValue("false");

  const verifyUrl = "https://osa.icuni.org/verify?token=" + verifyToken;
  const subject = "Verify your email \u2014 OSA Platform";

  const emailHtml = `
    <div style="font-family: 'Segoe UI', sans-serif; color: #1E293B; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #E2E8F0; border-radius: 12px; background: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #2D88FF; margin: 0; font-size: 24px;">OSA Platform</h2>
        <p style="color: #94A3B8; font-size: 13px; margin: 4px 0 0;">Old Students Association Network</p>
      </div>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 16px 0;" />
      <p style="font-size: 16px;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">Thank you for registering on the OSA platform. To complete your account setup and gain full access, please verify your email address by clicking the button below.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}" style="background-color: #2D88FF; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">Verify Email Address</a>
      </div>
      <p style="font-size: 12px; color: #94A3B8; text-align: center;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size: 11px; color: #64748B; text-align: center; word-break: break-all;">${verifyUrl}</p>
      <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #94A3B8;">If you did not create this account, please ignore this email.</p>
      <p style="font-size: 12px; color: #94A3B8; margin-top: 8px;">\u2014 OSA Platform Security &bull; ICUNI Labs</p>
    </div>
  `;

  MailApp.sendEmail({
    to: recipientEmail,
    subject: subject,
    htmlBody: emailHtml,
    name: "OSA Platform",
    replyTo: "donotreply@icuni.org"
  });
}

function validateToken(token) {
  if (!token) return null;
  const membersSheet = getSheet("members", CURRENT_SCHOOL_ID);
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
  // Tier 5: Platform
  "Platform President": 5, "Platform Vice President": 5, "Platform Gen. Secretary": 5, "Platform Organiser": 5, "Platform Finance Exec": 5, "IT Department": 5, "Platform Admin": 5, "Super Admin": 5,
  
  // Tier 4: School
  "School President": 4, "School Vice President": 4, "School Gen. Secretary": 4, "School Organiser": 4, "School Finance Exec": 4, "School Administrator": 4,
  
  // Tier 3: House
  "House Captain": 3, "House Vice President": 3, "House Gen. Secretary": 3, "House Organiser": 3, "House Finance Exec": 3,
  
  // Tier 2: Club
  "Club President": 2, "Club Vice President": 2, "Club Gen. Secretary": 2, "Club Organiser": 2, "Club Finance Exec": 2,
  
  // Tier 1: Year Group
  "YG President": 1, "YG Vice President": 1, "YG Gen. Secretary": 1, "YG Organiser": 1, "YG Finance Exec": 1,
  
  // Tier 0
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

  const sheet = getSheet("members", CURRENT_SCHOOL_ID);
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

function getDashboard(user, data = {}) {
  const userSchool = user.school || "Aggrey Memorial";
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;
  
  // Assemble basic stats based on active scope
  const ygs = getSheetData("members", CURRENT_SCHOOL_ID).filter(m => 
     (m.school || "Aggrey Memorial") === userSchool && 
     (scope_type === "school" || m.year_group_id === scope_id || m.house_name === scope_id || m.final_class === scope_id)
  );
  
  const posts = getSheetData("posts", CURRENT_SCHOOL_ID).filter(p => 
     (p.school || "Aggrey Memorial") === userSchool && 
     ((p.scope_type === scope_type && p.scope_id === scope_id) || (scope_type === "yeargroup" && p.year_group_id === scope_id)) && 
     p.status === "Approved"
  );
  
  const activeCampaigns = getSheetData("campaigns", CURRENT_SCHOOL_ID).filter(c => 
     (c.school || "Aggrey Memorial") === userSchool && 
     c.status === "active" && 
     (c.scope === "school" || c.scope_id === scope_id)
  );
  
  const upcomingEvents = getSheetData("events", CURRENT_SCHOOL_ID).filter(e => {
     if ((e.school || "Aggrey Memorial") !== userSchool) return false;
     let isVisible = (e.scope === "platform" || e.scope === "school" || e.scope_id === scope_id);
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
  const allowedFields = ["name", "username", "bio", "profession", "location", "phone", "linkedin", "social_links", "cover_url", "profile_pic",
                         "priv_bio", "priv_profession", "priv_location", "priv_phone", "priv_linkedin", "priv_email", "priv_social"];
  
  const sheet = getSheet("members", CURRENT_SCHOOL_ID);
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
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;
  const targetSchool = user.school || "Aggrey Memorial"; 
  
  const allMembers = getSheetData("members", CURRENT_SCHOOL_ID).filter(m => (m.school || "Aggrey Memorial") === targetSchool);

  let filteredMembers = [];
  
  if (scope_type === "yeargroup") {
    filteredMembers = allMembers.filter(m => m.year_group_id === scope_id);
  } else if (scope_type === "club") {
    filteredMembers = allMembers.filter(m => {
        let clubs = safeJsonParse(m.clubs, []);
        if (!clubs.includes(scope_id)) return false;
        return checkSupergroup(user.year_group_id, m.year_group_id);
    });
  } else if (scope_type === "house") {
    filteredMembers = allMembers.filter(m => m.house_name === scope_id);
  } else if (scope_type === "class") {
    filteredMembers = allMembers.filter(m => m.final_class === scope_id);
  } else if (scope_type === "school") {
    filteredMembers = allMembers.filter(m => m.school === scope_id);
  } else if (scope_type === "all") {
    if (user.role.includes("Platform")) {
        filteredMembers = getSheetData("members", CURRENT_SCHOOL_ID);
    }
  }

  // Apply privacy rules per field (applyPrivacyFilters aliases into privacy map)
  const safeMembers = filteredMembers.map(m => applyPrivacyFilters(m, user));
  return { success: true, data: safeMembers };
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
  
  const privFields = ["email", "phone", "location", "profession", "linkedin", "bio", "social"];
  
  privFields.forEach(field => {
    let setting = safeTarget["priv_" + field] || "hidden";
    
    // Social links are stored in 'social_links' but privacy setting is 'priv_social'
    let dataField = field === "social" ? "social_links" : field;

    if (setting === "hidden") {
      delete safeTarget[dataField];
    } else if (setting === "yeargroup" && relationship !== "yeargroup") {
       delete safeTarget[dataField];
    } else if (setting === "school" && relationship !== "yeargroup" && relationship !== "school") {
       delete safeTarget[dataField];
    }
  });

  return safeTarget;
}


// ==========================================
// Centralized Supergroup Validation Hook
// ==========================================
function checkSupergroup(baseYgId, targetYgId) {
    if (!baseYgId || !targetYgId) return true; // Allow defaults if data is malformed
    const ygData = getYearGroupsData();
    let y1 = ygData[baseYgId] ? parseInt(ygData[baseYgId].year) : 0;
    let y2 = ygData[targetYgId] ? parseInt(ygData[targetYgId].year) : 0;
    if (y1 > 0 && y2 > 0) return Math.abs(y1 - y2) <= 2;
    return false; // Strict fallback since clubs are entirely Supergroup locked
}

// ==========================================
// Newsletter & Posts
// ==========================================

function getPosts(user, data) {
  const userSchool = user.school || "Aggrey Memorial";
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;

  const allPosts = getSheetData("posts", CURRENT_SCHOOL_ID).filter(p => (p.school || "Aggrey Memorial") === userSchool); // P0: Tenant Isolation
  
  // Author filtering mapping caching
  const allMembers = getSheetData("members", CURRENT_SCHOOL_ID);
  const memMap = {};
  allMembers.forEach(m => memMap[m.id] = m);

  let userPosts = [];
  if (scope_type === "club") {
      userPosts = allPosts.filter(p => {
         if (p.scope_type !== "club" || p.scope_id !== scope_id) return false;
         let author = memMap[p.author_id];
         if (!author) return true;
         return checkSupergroup(user.year_group_id, author.year_group_id);
      });
  } else {
      userPosts = allPosts.filter(p => 
          (p.scope_type === scope_type && p.scope_id === scope_id) ||
          (scope_type === "yeargroup" && p.year_group_id === scope_id)
      );
  }
  
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

  const sheet = getSheet("posts", CURRENT_SCHOOL_ID);
  const headers = getHeaders(sheet);
  
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;

  const newPost = {
    id: Utilities.getUuid(),
    title: title,
    category: category,
    content: content,
    author_id: user.id,
    author_name: user.name,
    scope_type: scope_type,
    scope_id: scope_id,
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
  const sheet = getSheet("posts", CURRENT_SCHOOL_ID);
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  
  for(let i=1; i<rows.length; i++){
    let row = rowToObject(rows[i], headers);
    if(row.id === post_id) {
       // Check if they have rights to this YG
       if(user.role !== "Super Admin" && !user.role.includes("Platform") && !user.role.includes("School Administrator") && row.year_group_id !== user.year_group_id) {
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
           const nlSheet = getSheet("newsletters", CURRENT_SCHOOL_ID);
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
  const postSheet = getSheet("posts", CURRENT_SCHOOL_ID);
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
  const memberRows = getSheetData("members", CURRENT_SCHOOL_ID);
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
  const nlSheet = getSheet("newsletters", CURRENT_SCHOOL_ID);
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
  
  const allCampaigns = getSheetData("campaigns", CURRENT_SCHOOL_ID).filter(c => (c.school || "Aggrey Memorial") === userSchool); // P0: Tenant Isolation
  
  const allMembers = getSheetData("members", CURRENT_SCHOOL_ID);
  const memMap = {};
  allMembers.forEach(m => memMap[m.id] = m);

  const visible = allCampaigns.filter(c => {
     if(scopeFilter === "my_school" && c.school !== user.school) return false;
     
     if (c.scope_type === "club") {
         let creator = memMap[c.created_by];
         if (!creator) return true;
         return checkSupergroup(user.year_group_id, creator.year_group_id);
     }
     
     if(c.scope === "yeargroup" && c.year_group_id !== user.year_group_id) return false;
     return true;
  });
  
  visible.forEach(c => c.updates = safeJsonParse(c.updates, []));
  
  return { success: true, data: visible };
}

function handleDonation(user, data) {
   const { campaign_id, amount } = data;
   if(!amount || isNaN(amount)) return { success: false, error: "Invalid amount" };

   // Log donation
   const sheet = getSheet("donations", CURRENT_SCHOOL_ID);
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
   const campSheet = getSheet("campaigns", CURRENT_SCHOOL_ID);
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
  
  const events = getSheetData("events", CURRENT_SCHOOL_ID).filter(e => (e.school || "Aggrey Memorial") === userSchool); // P0: Tenant Isolation
  
  const allMembers = getSheetData("members", CURRENT_SCHOOL_ID);
  const memMap = {};
  allMembers.forEach(m => memMap[m.id] = m);

  const visible = events.filter(e => {
     if (e.scope_type === "club") {
         let creator = memMap[e.created_by];
         if (!creator) return true;
         return checkSupergroup(user.year_group_id, creator.year_group_id);
     }
     if(e.scope === "yeargroup" && e.year_group_id !== user.year_group_id && user.role !== "Super Admin") return false;
     return true;
  });

  // Check RSVPs
  const rsvps = getSheetData("rsvps", CURRENT_SCHOOL_ID).filter(r => r.user_id === user.id);
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
   const rsvps = getSheetData("rsvps", CURRENT_SCHOOL_ID);
   let found = rsvps.find(r => r.event_id === event_id && r.user_id === user.id);
   const sheet = getSheet("rsvps", CURRENT_SCHOOL_ID);

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
   const evts = getSheetData("events", CURRENT_SCHOOL_ID);
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
      
      const url = "https://lh3.googleusercontent.com/d/" + file.getId();

      // Log the upload in the gallery if it's not a profile or group picture
      if (group_id !== "profile_pics" && group_id !== "profile_covers" && group_id !== "group_avatars") {
        const gSheet = getSheet("galleries", CURRENT_SCHOOL_ID);
        const headers = getHeaders(gSheet);
        gSheet.appendRow(headers.map(h => {
          if(h==="id") return Utilities.getUuid();
          if(h==="scope_type") return data.scope_type || "yeargroup";
          if(h==="scope_id") return data.scope_id || group_id;
          if(h==="group_id") return group_id; // legacy 
          if(h==="album_id") return album_id || "";
          if(h==="uploaded_by_id") return user.id;
          if(h==="uploaded_by_name") return user.name;
          if(h==="url") return url;
          if(h==="timestamp") return new Date().toISOString();
          if(h==="school") return user.school; // P0 FIX: Data Isolation
          return "";
        }));
      }

      return { success: true, data: { url: url } };
    } catch(err) {
      return { success: false, error: err.toString() };
    }
}

function updateGroupAvatar(user, data) {
    const { scope_type, scope_id, url } = data;
    if (!url) return { success: false, error: "No URL provided" };
    
    // Authorization check
    let isExec = user.role.includes("President") || user.role.includes("Admin");
    if (!isExec && user.role !== "Super Admin" && user.role !== "IT Department") {
       return { success: false, error: "Unauthorized. Must be an admin/exec." };
    }

    let sheetName = scope_type === "school" ? "schools" : "year_groups";
    let targetId = scope_type === "school" ? user.school : scope_id;
    
    // For school scope, targetId uses the school name from the user object right now.
    // Let's find the correct row
    const sheet = getSheet(sheetName);
    const headers = getHeaders(sheet);
    const rows = sheet.getDataRange().getValues();
    
    // Ensure avatar column exists
    let avatarIndex = headers.indexOf("avatar");
    if(avatarIndex === -1) {
       // Append header dynamically if missing
       sheet.getRange(1, headers.length + 1).setValue("avatar");
       avatarIndex = headers.length;
    }
    
    for(let i=1; i<rows.length; i++) {
        let rowObj = rowToObject(rows[i], headers);
        // Matching logic
        let match = false;
        if (sheetName === "schools" && rowObj.name === targetId) match = true;
        if (sheetName === "year_groups" && rowObj.id === targetId) match = true;
        
        if (match) {
            sheet.getRange(i+1, avatarIndex + 1).setValue(url);
            return { success: true, message: "Avatar updated" };
        }
    }
    
    return { success: false, error: "Group not found to update." };
}

function getAlbums(user, data) {
    const userSchool = user.school || "Aggrey Memorial";
    const scope_type = data.scope_type || "yeargroup";
    const scope_id = data.scope_id || user.year_group_id;

    const allMembers = getSheetData("members", CURRENT_SCHOOL_ID);
    const memMap = {};
    allMembers.forEach(m => memMap[m.id] = m);

    const albums = getSheetData("albums", CURRENT_SCHOOL_ID).filter(a => {
       if ((a.school || "Aggrey Memorial") !== userSchool) return false;
       if (!((a.scope_type === scope_type && a.scope_id === scope_id) || a.group_id === scope_id)) return false;
       
       if (scope_type === "club") {
           let creator = memMap[a.created_by_id];
           if (!creator) return true;
           return checkSupergroup(user.year_group_id, creator.year_group_id);
       }
       return true;
    }); 
    return { success: true, data: albums.reverse() };
}

function createAlbum(user, data) {
    const { group_id, name, description } = data;
    if (!name) return { success: false, error: "Name required" };
    
    const sheet = getSheet("albums", CURRENT_SCHOOL_ID);
    const headers = getHeaders(sheet);
    let id = Utilities.getUuid();
    sheet.appendRow(headers.map(h => {
        if(h==="id") return id;
        if(h==="scope_type") return data.scope_type || "yeargroup";
        if(h==="scope_id") return data.scope_id || data.group_id;
        if(h==="group_id") return data.group_id || ""; // legacy hook
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
    const scope_type = data.scope_type || "yeargroup";
    const scope_id = data.scope_id || user.year_group_id;

    const allMembers = getSheetData("members", CURRENT_SCHOOL_ID);
    const memMap = {};
    allMembers.forEach(m => memMap[m.id] = m);

    let images = getSheetData("galleries", CURRENT_SCHOOL_ID).filter(g => {
       if ((g.school || "Aggrey Memorial") !== userSchool) return false;
       if (!((g.scope_type === scope_type && g.scope_id === scope_id) || g.group_id === scope_id)) return false;
       
       if (scope_type === "club") {
           let uploader = memMap[g.uploaded_by_id];
           if (!uploader) return true;
           return checkSupergroup(user.year_group_id, uploader.year_group_id);
       }
       return true;
    });
    if (data.album_id) {
        images = images.filter(g => g.album_id === data.album_id);
    }
    return { success: true, data: images.reverse() };
}

function getBoardMessages(user, data) {
    const scope_type = data.scope_type || "yeargroup";
    const scope_id = data.scope_id || data.group_id || user.year_group_id;
    const userSchool = user.school || "Aggrey Memorial";

    const allMembers = getSheetData("members", CURRENT_SCHOOL_ID);
    const memMap = {};
    allMembers.forEach(m => memMap[m.id] = m);

    let msgs = getSheetData("board_messages", CURRENT_SCHOOL_ID).filter(m => {
       if ((m.school || "Aggrey Memorial") !== userSchool) return false;
       if (!((m.scope_type === scope_type && m.scope_id === scope_id) || m.group_id === scope_id)) return false;
       
       if (scope_type === "club") {
           let author = memMap[m.author_id];
           if (!author) return true;
           return checkSupergroup(user.year_group_id, author.year_group_id);
       }
       return true;
    }); 
    msgs.forEach(m => {
        m.comments = safeJsonParse(m.comments, []);
        m.reactions = safeJsonParse(m.reactions, []);
    });

    return { success: true, data: msgs.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)) };
}

function postBoardMessage(user, data) {
    const { group_id, content } = data;
    if(!content) return { success: false, error: "Content empty" };

    const sheet = getSheet("board_messages", CURRENT_SCHOOL_ID);
    const headers = getHeaders(sheet);
    let msgId = Utilities.getUuid();
    sheet.appendRow(headers.map(h => {
        if(h==="id") return msgId;
        if(h==="scope_type") return data.scope_type || "yeargroup";
        if(h==="scope_id") return data.scope_id || data.group_id;
        if(h==="group_id") return data.group_id || ""; // legacy bounds
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
    const sheet = getSheet("board_messages", CURRENT_SCHOOL_ID);
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
    const sheet = getSheet("board_messages", CURRENT_SCHOOL_ID);
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

function getMasterDB() {
  return SpreadsheetApp.openById(MASTER_DB_ID);
}




function getMasterDB() {
  return SpreadsheetApp.openById(MASTER_DB_ID);
}

function getDB(schoolId) {
  if (!schoolId || schoolId === "ICUNI_LABS") return getMasterDB();
  const cache = CacheService.getScriptCache();
  const cachedId = cache.get("school_db_" + schoolId);
  if (cachedId) return SpreadsheetApp.openById(cachedId);

  const master = getMasterDB();
  const schoolsSheet = master.getSheetByName("schools");
  if (!schoolsSheet) return master;
  
  const headers = getHeaders(schoolsSheet);
  const rows = schoolsSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
     let row = rowToObject(rows[i], headers);
     if (row.id === schoolId && row.spreadsheet_id) {
         cache.put("school_db_" + schoolId, row.spreadsheet_id, 21600);
         return SpreadsheetApp.openById(row.spreadsheet_id);
     }
  }
  return master;
}

function getSheet(name, schoolId = CURRENT_SCHOOL_ID) {
  let db = getDB(schoolId);
  if (db.getId() === MASTER_DB_ID && name === "members") {
      name = "staff";
  }
  let sheet = db.getSheetByName(name);
  if (!sheet) {
      console.log("Sheet " + name + " not found in DB " + db.getId() + ". Auto-initializing schema.");
      INITIALIZE_SHEETS(db);
      sheet = db.getSheetByName(name);
  }
  return sheet;
}
function getHeaders(sheet) {
  // Return the first row as lowercase header names
  if (!sheet) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().replace(/\s+/g, '_'));
}

function getSheetData(name, schoolId = CURRENT_SCHOOL_ID) {
  const sheet = getSheet(name, schoolId);
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
   let rows = getSheetData("year_groups", CURRENT_SCHOOL_ID);
   let map = {};
   rows.forEach(r => map[r.id] = r);
   return map;
}

/**
 * Utility to run once to setup sheets schema manually if empty.
 */
function INITIALIZE_SHEETS(targetDB = null) {
    const ss = targetDB || getDB(null);
    const isMaster = ss.getId() === MASTER_DB_ID;

    const allSheets = {
        "staff": ["id", "name", "username", "email", "password", "role", "year_group_id", "year_group_nickname", "final_class", "house_name", "gender", "cheque_colour", "school", "association", "date_joined", "session_token", "token_expiry", "priv_email", "priv_phone", "priv_location", "priv_profession", "priv_linkedin", "priv_bio", "priv_social", "bio", "profession", "location", "phone", "linkedin", "social_links", "profile_pic", "cover_url", "school_admin_id", "verification_status", "drive_folder_id"],
        "schools": ["id", "name", "association_name", "association_short_name", "motto", "colours", "cheque_representation", "type", "classes", "houses", "status", "admin_id", "avatar", "spreadsheet_id", "drive_folder_id"],
        "year_groups": ["id", "school", "year", "nickname", "house_name", "cheque_colour", "avatar", "drive_folder_id"],
        "members": ["id", "name", "username", "email", "password", "role", "year_group_id", "year_group_nickname", "final_class", "house_name", "gender", "cheque_colour", "school", "association", "date_joined", "session_token", "token_expiry", "priv_email", "priv_phone", "priv_location", "priv_profession", "priv_linkedin", "priv_bio", "priv_social", "bio", "profession", "location", "phone", "linkedin", "social_links", "profile_pic", "cover_url", "school_admin_id", "verification_status", "drive_folder_id"],
        "posts": ["id", "title", "category", "content", "author_id", "author_name", "scope_type", "scope_id", "school", "submission_date", "status", "newsletter_month", "rejection_note"],
        "campaigns": ["id", "title", "type", "description", "target_amount", "currency", "deadline", "scope", "scope_type", "scope_id", "school", "status", "raised_amount", "donor_count", "updates", "created_by"],
        "donations": ["id", "campaign_id", "donor_id", "amount", "timestamp", "payment_method"],
        "events": ["id", "title", "type", "description", "date", "time", "virtual_link", "venue", "scope", "scope_type", "scope_id", "school", "max_attendees", "status", "created_by"],
        "rsvps": ["id", "event_id", "user_id", "timestamp"],
        "newsletters": ["id", "month", "scope_type", "scope_id", "post_ids", "recipient_count", "dispatched_by", "timestamp"],
        "board_messages": ["id", "scope_type", "scope_id", "school", "author_id", "author_name", "content", "comments", "reactions", "timestamp"],
        "albums": ["id", "scope_type", "scope_id", "school", "name", "description", "created_by_id", "created_by_name", "timestamp"],
        "galleries": ["id", "scope_type", "scope_id", "school", "album_id", "uploaded_by_id", "uploaded_by_name", "url", "timestamp"],
        "tickets": ["id", "author_id", "author_name", "school", "issue_type", "description", "status", "current_tier", "created_at", "last_escalated_at", "resolution"],
        "petitions": ["id", "target_sa_id", "target_sa_name", "scope_type", "scope_id", "school", "reason", "signatures", "status", "created_at"],
        "group_settings": ["id", "scope_type", "scope_id", "school", "settings_json", "updated_at"],
        "system_config": ["key", "value"],
        "logs": ["timestamp", "action", "user", "details"],
        "privileges": ["id", "account_type", "permissions_json", "description"],
        "tiers": ["id", "tier_name", "features_json"]
    };

    let sheetsToCreate = {};
    if (isMaster) {
        const masterKeys = ["staff", "schools", "tickets", "events", "newsletters", "privileges", "tiers", "system_config", "logs"];
        masterKeys.forEach(k => { sheetsToCreate[k] = allSheets[k]; });
    } else {
        const schoolKeys = ["members", "year_groups", "posts", "campaigns", "donations", "events", "rsvps", "newsletters", "board_messages", "albums", "galleries", "tickets", "petitions", "group_settings", "logs"];
        schoolKeys.forEach(k => { sheetsToCreate[k] = allSheets[k]; });
    }

    for (let s in sheetsToCreate) {
        let sheet = ss.getSheetByName(s);
        if (!sheet) {
            sheet = ss.insertSheet(s);
            sheet.appendRow(sheetsToCreate[s]);
            
            // Auditor Hotfix: Seed Initial Year Group
            if (s === "year_groups") {
                sheet.appendRow(["yg-2012", "Aggrey Memorial", "2012", "The Pioneers", "Aggrey House", "#22c55e"]);
            }
            if (s === "privileges") {
                sheet.appendRow(["priv_sys", "IT Department", JSON.stringify({ "all": true }), "Unrestricted Global Platform Access"]);
                sheet.appendRow(["priv_staff", "ICUNI Staff", JSON.stringify({ "view_all_schools": true, "manage_tickets": true }), "Global Read-Only + Support Access"]);
                sheet.appendRow(["priv_sch_admin", "School Administrator", JSON.stringify({ "manage_school": true }), "Full control over a specific school"]);
            }
            if (s === "tiers") {
                sheet.appendRow(["tier_1", "Member", JSON.stringify({ "base_features": true })]);
                sheet.appendRow(["tier_2", "Club", JSON.stringify({ "base_features": true })]);
                sheet.appendRow(["tier_3", "Execs/Admins", JSON.stringify({ "manage_group": true })]);
                sheet.appendRow(["tier_4", "Super Admins", JSON.stringify({ "manage_school": true })]);
                sheet.appendRow(["tier_5", "Staff Members", JSON.stringify({ "manage_system": true })]);
            }
            if (s === "system_config") {
                sheet.appendRow(["feature_flags", JSON.stringify({ "maintenance_mode": false, "registration_open": true })]);
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

// ==========================================
// Tech Support system
// ==========================================

function getTickets(user, data) {
    const userSchool = user.school || "Aggrey Memorial";
    let tickets = getSheetData("tickets", CURRENT_SCHOOL_ID).filter(t => (t.school || "Aggrey Memorial") === userSchool);
    
    // Admins see tickets queued for them based on activeScope from UI, but typical dashboard needs to sort out "my tickets" vs "admin queue"
    // For now, return all school tickets and let frontend segment them
    return { success: true, data: tickets.reverse() };
}

function submitTicket(user, data) {
    const { issue_type, description, initial_tier } = data;
    if (!description || !issue_type) return { success: false, error: "Missing fields" };

    const sheet = getSheet("tickets", CURRENT_SCHOOL_ID);
    const headers = getHeaders(sheet);
    let id = Utilities.getUuid();
    
    const newTicket = {
       id: id,
       author_id: user.id,
       author_name: user.name,
       school: user.school,
       issue_type: issue_type,
       description: description,
       status: "Open",
       current_tier: initial_tier || "Year Group",
       created_at: new Date().toISOString(),
       last_escalated_at: new Date().toISOString(),
       resolution: ""
    };
    
    sheet.appendRow(headers.map(h => newTicket[h] || ""));
    return { success: true, data: newTicket };
}

function escalateTicket(user, data) {
    const { ticket_id } = data;
    const sheet = getSheet("tickets", CURRENT_SCHOOL_ID);
    const headers = getHeaders(sheet);
    const rows = sheet.getDataRange().getValues();

    const tiers = ["Year Group", "Club", "House", "School Admin", "ICUNI Labs"];

    for (let i = 1; i < rows.length; i++) {
        let row = rowToObject(rows[i], headers);
        if (row.id === ticket_id) {
            let idx = tiers.indexOf(row.current_tier);
            if (idx >= 0 && idx < tiers.length - 1) {
                let nextTier = tiers[idx + 1];
                sheet.getRange(i + 1, headers.indexOf("current_tier") + 1).setValue(nextTier);
                sheet.getRange(i + 1, headers.indexOf("status") + 1).setValue("Escalated");
                sheet.getRange(i + 1, headers.indexOf("last_escalated_at") + 1).setValue(new Date().toISOString());
                return { success: true, message: `Ticket escalated to ${nextTier}` };
            } else {
                return { success: false, error: "Cannot escalate further" };
            }
        }
    }
    return { success: false, error: "Ticket not found" };
}

function resolveTicket(user, data) {
    const { ticket_id, resolution } = data;
    const sheet = getSheet("tickets", CURRENT_SCHOOL_ID);
    const headers = getHeaders(sheet);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
        let row = rowToObject(rows[i], headers);
        if (row.id === ticket_id) {
            sheet.getRange(i + 1, headers.indexOf("status") + 1).setValue("Resolved");
            sheet.getRange(i + 1, headers.indexOf("resolution") + 1).setValue(resolution || "");
            return { success: true, message: `Ticket resolved` };
        }
    }
    return { success: false, error: "Ticket not found" };
}

function migrateImages(user, data) {
    let patched = 0;
    const sheetsToMigrate = ["members", "galleries", "schools", "posts", "albums"];
    sheetsToMigrate.forEach(sheetName => {
        const sheet = getSheet(sheetName);
        if(!sheet) return;
        const headers = getHeaders(sheet);
        const rows = sheet.getDataRange().getValues();
        // find columns that might have images
        const colsToCheck = ["profile_pic", "cover_url", "url", "logo_url", "brand_color", "avatar"]; 
        const colIndices = colsToCheck.map(c => headers.indexOf(c)).filter(i => i !== -1);
        
        for (let i = 1; i < rows.length; i++) {
           colIndices.forEach(colIndex => {
              let val = rows[i][colIndex];
              if(typeof val === 'string' && val.includes("drive.google.com/uc?export=view&id=")) {
                 let newUrl = val.replace("https://drive.google.com/uc?export=view&id=", "https://lh3.googleusercontent.com/d/");
                 sheet.getRange(i+1, colIndex+1).setValue(newUrl);
                 patched++;
              }
           });
        }
    });
    return { success: true, patched: patched };
}

function seedTestAccount(user, data) {
    const sheet = getSheet("members", CURRENT_SCHOOL_ID);
    const headers = getHeaders(sheet);
    const newId = "usr_tester_seed_" + new Date().getTime();
    const newMember = {
        id: newId,
        name: "Test Executive",
        username: "testexec",
        email: "testexec_" + new Date().getTime() + "@example.com",
        password: "testpassword", // hashed in prod
        role: "School Administrator",
        year_group_id: "ADMIN",
        year_group_nickname: "School Executives",
        school: data.targetSchool || user.school || "Auditor Academy",
        association: data.targetSchool || "Auditor Academy",
        date_joined: new Date().toISOString()
    };
    sheet.appendRow(headers.map(h => newMember[h] !== undefined ? newMember[h] : ""));

    const ticketsSheet = getSheet("tickets", CURRENT_SCHOOL_ID);
    if (ticketsSheet) {
        const tHeaders = getHeaders(ticketsSheet);
        const newTicket = {
           id: "ticket_seed_" + new Date().getTime(),
           author_id: newId,
           author_name: "Test Executive",
           school: data.targetSchool || user.school || "Auditor Academy",
           issue_type: "Access Request",
           description: "I need assistance setting up my dashboard features. Please grant me permission to edit the general school gallery.",
           status: "Open",
           current_tier: 4,
           created_at: new Date().toISOString(),
           resolution: ""
        };
        ticketsSheet.appendRow(tHeaders.map(h => newTicket[h] !== undefined ? newTicket[h] : ""));
    }

    return { success: true, data: { created: newId } };
}

function getGroupSettings(user, data) {
    const scope_type = data.scope_type || "yeargroup";
    const scope_id = data.scope_id || user.year_group_id || user.school;
    if (!scope_type || !scope_id) return { success: true, data: {} }; // fail gracefully for Dashboard

    const rows = getSheetData("group_settings", CURRENT_SCHOOL_ID);
    const targetSchool = user.school || "Aggrey Memorial";

    const match = rows.find(r => 
        (r.school === targetSchool) && 
        (r.scope_type === scope_type) && 
        (r.scope_id === scope_id)
    );

    if (match) {
        return { success: true, data: safeJsonParse(match.settings_json, {}) };
    }
    return { success: true, data: {} };
}

function saveGroupSettings(user, data) {
    const { scope_type, scope_id, settings } = data;
    if (!scope_type || !scope_id) return { success: false, error: "Missing scope" };

    // Authorization check
    let isExec = user.role.includes("President") || user.role.includes("Admin");
    if (!isExec && user.role !== "Super Admin" && user.role !== "IT Department") {
       return { success: false, error: "Unauthorized. Must be an admin/exec." };
    }

    const sheet = getSheet("group_settings", CURRENT_SCHOOL_ID);
    const headers = getHeaders(sheet);
    const rows = sheet.getDataRange().getValues();
    const targetSchool = user.school || "Aggrey Memorial";

    let foundIndex = -1;
    for (let i = 1; i < rows.length; i++) {
        let row = rowToObject(rows[i], headers);
        if (row.school === targetSchool && row.scope_type === scope_type && row.scope_id === scope_id) {
            foundIndex = i;
            break;
        }
    }

    const newJson = JSON.stringify(settings);
    const nowStamp = new Date().toISOString();

    if (foundIndex > -1) {
        // Upsert
        sheet.getRange(foundIndex + 1, headers.indexOf("settings_json") + 1).setValue(newJson);
        sheet.getRange(foundIndex + 1, headers.indexOf("updated_at") + 1).setValue(nowStamp);
    } else {
        // Insert
        let newId = Utilities.getUuid();
        let newRow = {
            id: newId,
            scope_type: scope_type,
            scope_id: scope_id,
            school: targetSchool,
            settings_json: newJson,
            updated_at: nowStamp
        };
        sheet.appendRow(headers.map(h => newRow[h] || ""));
    }

    return { success: true, message: "Settings saved successfully" };
}

// ==========================================
// ICUNI Labs Cockpit Functions
// ==========================================

function getSystemOverview(user) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };

  const members = getSheetData("members", CURRENT_SCHOOL_ID);
  const schools = getSheetData("schools", CURRENT_SCHOOL_ID);
  const tickets = getSheetData("tickets", CURRENT_SCHOOL_ID);
  const posts = getSheetData("posts", CURRENT_SCHOOL_ID);

  const openTickets = tickets.filter(t => t.status !== "Resolved");
  const escalatedTickets = tickets.filter(t => t.status === "Escalated");
  const pendingPosts = posts.filter(p => p.status === "Pending");

  // School summaries
  const schoolSummaries = schools.map(s => {
    const schoolMembers = members.filter(m => m.school === s.id);
    const schoolTickets = tickets.filter(t => t.school === s.id && t.status !== "Resolved");
    return {
      id: s.id,
      name: s.name,
      status: s.status || "Active",
      memberCount: schoolMembers.length,
      openTicketCount: schoolTickets.length
    };
  });

  // Recent activity (last 10 items from tickets + posts, sorted by date)
  const recentActivity = [];
  tickets.slice(-5).reverse().forEach(t => {
    recentActivity.push({
      type: "ticket",
      label: t.issue_type,
      actor: t.author_name,
      status: t.status,
      school: t.school,
      date: t.created_at
    });
  });
  posts.slice(-5).reverse().forEach(p => {
    recentActivity.push({
      type: "post",
      label: p.title,
      actor: p.author_name,
      status: p.status,
      school: p.school,
      date: p.submission_date
    });
  });
  recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    success: true,
    data: {
      totalSchools: schools.length,
      totalMembers: members.length,
      openTickets: openTickets.length,
      escalatedTickets: escalatedTickets.length,
      pendingPosts: pendingPosts.length,
      staffCount: members.filter(m => m.role === "IT Department").length,
      schools: schoolSummaries,
      escalatedTicketsList: escalatedTickets.map(t => ({
        id: t.id,
        issue_type: t.issue_type,
        description: t.description,
        author_name: t.author_name,
        school: t.school,
        current_tier: t.current_tier,
        status: t.status,
        created_at: t.created_at
      })),
      recentActivity: recentActivity.slice(0, 10)
    }
  };
}

function getStaffRoster(user) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };

  const members = getSheetData("members", CURRENT_SCHOOL_ID);
  const staff = members.filter(m => m.role === "IT Department");

  return {
    success: true,
    data: staff.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      date_joined: s.date_joined,
      profile_pic: s.profile_pic || "",
      bio: s.bio || "",
      profession: s.profession || ""
    }))
  };
}

function addStaffMember(user, data) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };

  const { name, email, password } = data;
  if (!name || !email || !password) return { success: false, error: "Missing required fields: name, email, password" };

  const ms = getSheet("members", CURRENT_SCHOOL_ID);
  const mh = getHeaders(ms);
  const rows = ms.getDataRange().getValues();

  // Check for duplicate email
  for (let i = 1; i < rows.length; i++) {
    const row = rowToObject(rows[i], mh);
    if (row.email && row.email.toLowerCase() === email.toLowerCase()) {
      return { success: false, error: "A member with this email already exists" };
    }
  }

  const schoolsData = getSheetData("schools", CURRENT_SCHOOL_ID);
  const targetSchool = schoolsData.length > 0 ? schoolsData[0].id : "AMOSA";
  const targetSchoolName = schoolsData.length > 0 ? schoolsData[0].name : "Aggrey Memorial";

  const newId = "staff_" + Utilities.getUuid().substring(0, 8);
  const now = new Date().toISOString();

  const staffRow = {
    id: newId,
    name: name,
    username: name.toLowerCase().replace(/\s+/g, '.'),
    email: email,
    password: password,
    role: "IT Department",
    year_group_id: "ADMIN",
    year_group_nickname: "School Executives",
    cheque_colour: "#0F172A",
    school: targetSchool,
    association: targetSchoolName,
    date_joined: now,
    email_verified: "true",
    id_verified: "true",
    verification_status: "Approved",
    bio: "",
    profession: "",
    location: "",
    priv_email: "all",
    priv_phone: "all",
    priv_location: "all",
    priv_profession: "all",
    priv_linkedin: "all",
    priv_bio: "all",
    priv_social: "all"
  };

  ms.appendRow(mh.map(h => staffRow[h] !== undefined ? staffRow[h] : ""));

  return {
    success: true,
    data: { id: newId, name, email, role: "IT Department" }
  };
}

function removeStaffMember(user, data) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };

  const { userId } = data;
  if (!userId) return { success: false, error: "Missing userId" };

  // Don't allow self-removal
  if (userId === user.id) return { success: false, error: "Cannot remove yourself" };

  const ms = getSheet("members", CURRENT_SCHOOL_ID);
  const mh = getHeaders(ms);
  const rows = ms.getDataRange().getValues();
  const roleCol = mh.indexOf("role");

  for (let i = 1; i < rows.length; i++) {
    const row = rowToObject(rows[i], mh);
    if (row.id === userId && row.role === "IT Department") {
      ms.getRange(i + 1, roleCol + 1).setValue("Member");
      return { success: true, message: row.name + " has been removed from IT Department" };
    }
  }

  return { success: false, error: "Staff member not found" };
}

// ==========================================
// ICUNI Labs — Extended Platform Control
// ==========================================

function removeSchool(user, data) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };
  const { schoolId } = data;
  if (!schoolId) return { success: false, error: "Missing schoolId" };

  const ss = getSheet("schools", CURRENT_SCHOOL_ID);
  const sh = getHeaders(ss);
  const rows = ss.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const row = rowToObject(rows[i], sh);
    if (row.id === schoolId) {
      ss.deleteRow(i + 1);
      return { success: true, message: "School '" + row.name + "' removed successfully." };
    }
  }
  return { success: false, error: "School not found" };
}

function getSheetDataRaw(user, data) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };
  const { sheetName, limit } = data;
  if (!sheetName) return { success: false, error: "Missing sheetName" };

  const allowed = ["members", "posts", "campaigns", "events", "tickets", "schools", "year_groups", "donations", "rsvps", "newsletters", "board_messages", "group_settings", "system_config"];
  if (allowed.indexOf(sheetName) === -1) return { success: false, error: "Sheet not allowed: " + sheetName };

  const sheet = getSheet(sheetName);
  if (!sheet) return { success: false, error: "Sheet not found" };
  const headers = getHeaders(sheet);
  const allRows = sheet.getDataRange().getValues();
  const maxRows = limit ? Math.min(parseInt(limit), allRows.length) : allRows.length;
  const result = [];
  for (let i = 1; i < maxRows; i++) {
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      // Mask passwords in output
      if (headers[j] === "password" || headers[j] === "session_token") {
        obj[headers[j]] = "••••••";
      } else {
        obj[headers[j]] = allRows[i][j];
      }
    }
    obj._rowIndex = i + 1;
    result.push(obj);
  }
  return { success: true, data: { headers: headers, rows: result, totalRows: allRows.length - 1 } };
}

function updateSheetCell(user, data) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };
  const { sheetName, rowIndex, columnName, value } = data;
  if (!sheetName || !rowIndex || !columnName) return { success: false, error: "Missing required fields" };

  // Block editing password and session_token for safety
  if (columnName === "password" || columnName === "session_token" || columnName === "token_expiry") {
    return { success: false, error: "Cannot directly edit " + columnName + ". Use the Override panel." };
  }

  const sheet = getSheet(sheetName);
  if (!sheet) return { success: false, error: "Sheet not found" };
  const headers = getHeaders(sheet);
  const colIdx = headers.indexOf(columnName);
  if (colIdx === -1) return { success: false, error: "Column not found: " + columnName };

  sheet.getRange(parseInt(rowIndex), colIdx + 1).setValue(value);
  return { success: true, message: "Cell updated: " + sheetName + "[" + rowIndex + "][" + columnName + "] = " + value };
}

function overrideMember(user, data) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };
  const { memberId, field, value } = data;
  if (!memberId || !field) return { success: false, error: "Missing memberId or field" };

  const allowedOverrides = ["role", "verification_status", "email_verified", "id_verified", "year_group_id", "year_group_nickname", "school", "name", "email", "house_name", "final_class", "gender", "cheque_colour"];
  if (allowedOverrides.indexOf(field) === -1) return { success: false, error: "Field not allowed for override: " + field };

  const ms = getSheet("members", CURRENT_SCHOOL_ID);
  const mh = getHeaders(ms);
  const rows = ms.getDataRange().getValues();
  const colIdx = mh.indexOf(field);
  if (colIdx === -1) return { success: false, error: "Column not found" };

  for (let i = 1; i < rows.length; i++) {
    const row = rowToObject(rows[i], mh);
    if (row.id === memberId) {
      ms.getRange(i + 1, colIdx + 1).setValue(value);
      return { success: true, message: row.name + "'s " + field + " updated to " + value };
    }
  }
  return { success: false, error: "Member not found" };
}

function saveFeatureFlags(user, data) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };
  const { flags } = data;
  if (!flags) return { success: false, error: "Missing flags object" };

  // Upsert into system_config sheet
  let sheet = getSheet("system_config", CURRENT_SCHOOL_ID);
  if (!sheet) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet("system_config");
    sheet.appendRow(["key", "value", "updated_at", "updated_by"]);
  }
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf("key")] === "feature_flags") {
      sheet.getRange(i + 1, headers.indexOf("value") + 1).setValue(JSON.stringify(flags));
      sheet.getRange(i + 1, headers.indexOf("updated_at") + 1).setValue(new Date().toISOString());
      sheet.getRange(i + 1, headers.indexOf("updated_by") + 1).setValue(user.name);
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow(["feature_flags", JSON.stringify(flags), new Date().toISOString(), user.name]);
  }
  return { success: true, message: "Feature flags saved" };
}

function getFeatureFlags(user) {
  if (user.role !== "IT Department") return { success: false, error: "Unauthorized" };
  let sheet;
  try { sheet = getSheet("system_config", CURRENT_SCHOOL_ID); } catch(e) { return { success: true, data: {} }; }
  if (!sheet) return { success: true, data: {} };
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf("key")] === "feature_flags") {
      return { success: true, data: safeJsonParse(rows[i][headers.indexOf("value")], {}) };
    }
  }
  return { success: true, data: {} };
}

// ==========================================
// ICUNI Labs Control Account Seed
// ==========================================

function seedICUNIControl() {
  const ms = getSheet("members", CURRENT_SCHOOL_ID);
  const mh = getHeaders(ms);
  const existingRows = ms.getDataRange().getValues();

  // Check if control account already exists
  for (let i = 1; i < existingRows.length; i++) {
    const row = rowToObject(existingRows[i], mh);
    if (row.email === "osa@icuni.org") {
      return { success: false, error: "Control account already exists. Log in with osa@icuni.org" };
    }
    // Migrate old control@icuni.org to osa@icuni.org
    if (row.email === "control@icuni.org") {
      const emailCol = mh.indexOf("email");
      ms.getRange(i + 1, emailCol + 1).setValue("osa@icuni.org");
      return { success: true, message: "Control account migrated to osa@icuni.org. Password unchanged." };
    }
  }

  // Resolve a school to attach to
  const schoolsData = getSheetData("schools", CURRENT_SCHOOL_ID);
  const targetSchool = schoolsData.length > 0 ? schoolsData[0].id : "AMOSA";
  const targetSchoolName = schoolsData.length > 0 ? schoolsData[0].name : "Aggrey Memorial";

  // Resolve a year group
  const ygData = getSheetData("year_groups", CURRENT_SCHOOL_ID);
  const targetYG = ygData.length > 0 ? ygData[0].id : "ADMIN";
  const targetYGName = ygData.length > 0 ? (ygData[0].nickname || "Class of " + ygData[0].year) : "School Executives";

  const now = new Date().toISOString();
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  // 0. Build Master Drive Folder Architecture for Staff
  const masterFolder = DriveApp.getFolderById(MASTER_FOLDER_ID);
  let staffBaseFolder;
  const staffIter = masterFolder.getFoldersByName("Staff (App Owners)");
  if(staffIter.hasNext()) {
    staffBaseFolder = staffIter.next();
  } else {
    staffBaseFolder = masterFolder.createFolder("Staff (App Owners)");
  }
  const existingSelfIt = staffBaseFolder.getFoldersByName("ICUNI Labs Control");
  let selfFolder = existingSelfIt.hasNext() ? existingSelfIt.next() : staffBaseFolder.createFolder("ICUNI Labs Control");

  // ── 1. Control Account ──
  const controlId = "icuni_ctrl_" + Utilities.getUuid().substring(0, 8);
  const controlRow = {
    id: controlId,
    name: "ICUNI Labs Control",
    username: "icuni.control",
    email: "osa@icuni.org",
    password: Utilities.getUuid().substring(0, 12) + "!A1",
    role: "IT Department",
    year_group_id: "ADMIN",
    year_group_nickname: "School Executives",
    final_class: "",
    house_name: "",
    gender: "",
    cheque_colour: "#0F172A",
    school: targetSchool,
    association: targetSchoolName,
    date_joined: now,
    session_token: token,
    token_expiry: expiry.toISOString(),
    email_verified: "true",
    id_verified: "true",
    verification_status: "Approved",
    priv_email: "all",
    priv_phone: "all",
    priv_location: "all",
    priv_profession: "all",
    priv_linkedin: "all",
    priv_bio: "all",
    priv_social: "all",
    bio: "ICUNI Labs Platform Operations. Full administrative control.",
    profession: "Platform Engineering",
    location: "Accra, Ghana",
    phone: "+233 000 000 000",
    linkedin: "",
    social_links: "{}",
    cover_url: "",
    drive_folder_id: selfFolder.getId()
  };
  ms.appendRow(mh.map(h => controlRow[h] !== undefined ? controlRow[h] : ""));

  // ── 2. Simulated Members ──
  const simMembers = [
    { name: "Kwame Asante", username: "kwame.asante", email: "kwame.asante@demo.osa.org", role: "YG President", yg: targetYG, ygn: targetYGName, house: "Casford", cls: "Science 1", gender: "Male", colour: "#2563EB", bio: "Leading the Class of 2018 reunion committee.", profession: "Civil Engineer", location: "Kumasi" },
    { name: "Ama Mensah", username: "ama.mensah", email: "ama.mensah@demo.osa.org", role: "YG Gen. Secretary", yg: targetYG, ygn: targetYGName, house: "Acquah", cls: "Arts 2", gender: "Female", colour: "#DC2626", bio: "Keeping the records straight since day one.", profession: "Journalist", location: "Takoradi" },
    { name: "Kofi Boateng", username: "kofi.boateng", email: "kofi.boateng@demo.osa.org", role: "Member", yg: targetYG, ygn: targetYGName, house: "Casford", cls: "Science 2", gender: "Male", colour: "#16A34A", bio: "Proud old student. Forever grateful.", profession: "Pharmacist", location: "Cape Coast" },
    { name: "Efua Owusu", username: "efua.owusu", email: "efua.owusu@demo.osa.org", role: "Member", yg: targetYG, ygn: targetYGName, house: "Acquah", cls: "Business 1", gender: "Female", colour: "#9333EA", bio: "Building bridges between alumni and the school.", profession: "Teacher", location: "Accra" },
    { name: "Yaw Adjei", username: "yaw.adjei", email: "yaw.adjei@demo.osa.org", role: "School Administrator", yg: "ADMIN", ygn: "School Executives", house: "", cls: "", gender: "Male", colour: "#F59E0B", bio: "Managing school operations and alumni relations.", profession: "School Administrator", location: "Cape Coast" }
  ];

  const memberIds = [];
  simMembers.forEach(m => {
    const mid = "sim_" + Utilities.getUuid().substring(0, 8);
    memberIds.push(mid);
    const mRow = {
      id: mid,
      name: m.name,
      username: m.username,
      email: m.email,
      password: Utilities.getUuid().substring(0, 10) + "!1",
      role: m.role,
      year_group_id: m.yg,
      year_group_nickname: m.ygn,
      final_class: m.cls,
      house_name: m.house,
      gender: m.gender,
      cheque_colour: m.colour,
      school: targetSchool,
      association: targetSchoolName,
      date_joined: now,
      session_token: "",
      token_expiry: "",
      email_verified: "true",
      verification_status: "Approved",
      priv_email: "yeargroup",
      priv_phone: "hidden",
      priv_location: "all",
      priv_profession: "all",
      priv_linkedin: "all",
      priv_bio: "yeargroup",
      priv_social: "yeargroup",
      bio: m.bio,
      profession: m.profession,
      location: m.location,
      phone: "",
      linkedin: "",
      social_links: "{}",
      cover_url: ""
    };
    ms.appendRow(mh.map(h => mRow[h] !== undefined ? mRow[h] : ""));
  });

  // ── 3. Support Tickets ──
  const ts = getSheet("tickets", CURRENT_SCHOOL_ID);
  if (ts) {
    const th = getHeaders(ts);
    const tickets = [
      { author_idx: 2, issue: "Platform Bug", desc: "The gallery thumbnails are not updating after uploading new images. Tried clearing cache but the issue persists.", status: "Open", tier: "Year Group" },
      { author_idx: 0, issue: "Access Request", desc: "I need elevated permissions to manage the fundraising module for our upcoming reunion event.", status: "Escalated", tier: "School Admin" },
      { author_idx: 3, issue: "Data Correction", desc: "My graduating year is listed incorrectly. I was Class of 2018, not 2019. Please update.", status: "Resolved", tier: "Year Group" }
    ];
    tickets.forEach((t, idx) => {
      const tRow = {
        id: "ticket_ctrl_" + (idx + 1),
        author_id: memberIds[t.author_idx],
        author_name: simMembers[t.author_idx].name,
        school: targetSchool,
        issue_type: t.issue,
        description: t.desc,
        status: t.status,
        current_tier: t.tier,
        created_at: new Date(Date.now() - 86400000 * (7 - idx * 2)).toISOString(),
        last_escalated_at: t.status === "Escalated" ? new Date(Date.now() - 86400000 * 2).toISOString() : "",
        resolution: t.status === "Resolved" ? "Year group records corrected. Please log out and back in to see updated info." : ""
      };
      ts.appendRow(th.map(h => tRow[h] !== undefined ? tRow[h] : ""));
    });
  }

  // ── 4. Newsletter Posts ──
  const ps = getSheet("posts", CURRENT_SCHOOL_ID);
  if (ps) {
    const ph = getHeaders(ps);
    const posts = [
      { title: "Annual Reunion Dinner Announcement", category: "Events", content: "We are pleased to announce the 2026 Annual Reunion Dinner, scheduled for Saturday, August 15th at the Golden Tulip Hotel. All year groups are invited. Early bird tickets available until June 30th. Contact your YG President for group bookings.", status: "Approved", author_idx: 0 },
      { title: "Scholarship Fund Progress Report", category: "Updates", content: "The scholarship committee is delighted to report that we have raised GHS 45,000 towards our target of GHS 100,000. Special thanks to the Class of 2010 for their generous contribution. We encourage all members to continue supporting this initiative.", status: "Pending", author_idx: 1 }
    ];
    const curMonth = new Date().getFullYear() + "-" + String(new Date().getMonth() + 1).padStart(2, "0");
    posts.forEach((p, idx) => {
      const pRow = {
        id: "post_ctrl_" + (idx + 1),
        title: p.title,
        category: p.category,
        content: p.content,
        author_id: memberIds[p.author_idx],
        author_name: simMembers[p.author_idx].name,
        scope_type: "yeargroup",
        scope_id: targetYG,
        year_group_id: targetYG,
        school: targetSchool,
        submission_date: new Date(Date.now() - 86400000 * (5 - idx * 3)).toISOString(),
        status: p.status,
        newsletter_month: p.status === "Approved" ? curMonth : "",
        rejection_note: ""
      };
      ps.appendRow(ph.map(h => pRow[h] !== undefined ? pRow[h] : ""));
    });
  }

  // ── 5. Board Message ──
  const bs = getSheet("board_messages", CURRENT_SCHOOL_ID);
  if (bs) {
    const bh = getHeaders(bs);
    const bRow = {
      id: "board_ctrl_1",
      author_id: memberIds[0],
      author_name: simMembers[0].name,
      author_pic: "",
      scope_type: "yeargroup",
      scope_id: targetYG,
      school: targetSchool,
      content: "Good afternoon everyone! Just a reminder that our monthly virtual meeting is this Friday at 7pm GMT. Agenda includes the reunion planning update and the scholarship fund report. Looking forward to seeing you all there. \u2014 Kwame",
      reactions: "{}",
      comments: "[]",
      created_at: new Date(Date.now() - 86400000 * 2).toISOString()
    };
    bs.appendRow(bh.map(h => bRow[h] !== undefined ? bRow[h] : ""));
  }

  return {
    success: true,
    message: "ICUNI Labs Control account seeded successfully.",
    data: {
      email: "osa@icuni.org",
      role: "IT Department",
      members_seeded: simMembers.length,
      tickets_seeded: 3,
      posts_seeded: 2,
      board_messages_seeded: 1
    }
  };
}

// ==========================================
// Log Rotation (Run via Weekly Cron Trigger)
// ==========================================
function rotateLogs() {
  const masterSS = getMasterDB();
  const logsSheet = masterSS.getSheetByName("logs");
  if (!logsSheet) return;

  const rows = logsSheet.getDataRange().getValues();
  if (rows.length <= 1) return; // Only headers or empty

  const masterFolder = DriveApp.getFolderById(MASTER_FOLDER_ID);
  let archiveFolder;
  const archiveIter = masterFolder.getFoldersByName("Logs_Archive");
  if (archiveIter.hasNext()) {
     archiveFolder = archiveIter.next();
  } else {
     archiveFolder = masterFolder.createFolder("Logs_Archive");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveName = "Logs_Archive_" + timestamp + ".csv";
  
  // Convert to CSV
  const csvContent = rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(",")).join("\\n");
  archiveFolder.createFile(archiveName, csvContent, "text/csv");

  // Clear logs sheet (keep headers)
  logsSheet.getRange(2, 1, rows.length - 1, logsSheet.getLastColumn()).clearContent();
  console.log("Exported " + (rows.length - 1) + " logs to " + archiveName);
}



function MANUAL_SCRUB_MASTER_DB() {
  handleAction('force_reset_db', {}, 'admin');
}

