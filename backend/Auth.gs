/**
 * OSA Platform — Authentication & Session Management
 * Contains: login, register, sessions, tokens, password reset, magic links,
 *           email verification, username uniqueness
 */

// ==========================================
// Token Validation (with CacheService)
// ==========================================

function validateToken(token) {
  if (!token) return null;

  // Check CacheService first (avoids cross-DB scans)
  const scriptCache = CacheService.getScriptCache();
  const cached = scriptCache.get("token:" + token);
  if (cached) {
    try {
      const user = JSON.parse(cached);
      if (user && new Date(user.token_expiry) > new Date()) {
        return user;
      }
      // Expired — remove from cache
      scriptCache.remove("token:" + token);
    } catch(e) {}
  }

  // Scan Master DB staff
  const masterSS = getMasterDB();
  const mSheet = masterSS.getSheetByName("staff");
  let headers = getHeaders(mSheet);
  let rows = mSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.session_token === token) {
      if (new Date(rowObj.token_expiry) > new Date()) {
        rowObj.rowIndex = i + 1;
        rowObj._sourceSheet = "staff";
        rowObj._sourceDB = MASTER_DB_ID;
        delete rowObj.password;
        // Cache for 6 hours
        scriptCache.put("token:" + token, JSON.stringify(rowObj), 21600);
        return rowObj;
      }
    }
  }

  // Scan school DBs
  const sSheet = masterSS.getSheetByName("schools");
  const sHeaders = getHeaders(sSheet);
  const sRows = sSheet.getDataRange().getValues();
  for (let j = 1; j < sRows.length; j++) {
    let sRow = rowToObject(sRows[j], sHeaders);
    if (!sRow.spreadsheet_id) continue;
    try {
      const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
      const schoolMSheet = schoolSS.getSheetByName("members");
      if (!schoolMSheet) continue;
      let smHeaders = getHeaders(schoolMSheet);
      let smRows = schoolMSheet.getDataRange().getValues();
      for (let k = 1; k < smRows.length; k++) {
        let uRow = rowToObject(smRows[k], smHeaders);
        if (uRow.session_token === token) {
          if (new Date(uRow.token_expiry) > new Date()) {
            uRow.rowIndex = k + 1;
            uRow._sourceSheet = "members";
            uRow._sourceDB = sRow.spreadsheet_id;
            delete uRow.password;
            scriptCache.put("token:" + token, JSON.stringify(uRow), 21600);
            return uRow;
          }
        }
      }
    } catch(e) {}
  }
  return null;
}

/**
 * Invalidate a cached token (call on logout, password change, etc.)
 */
function invalidateTokenCache(token) {
  if (!token) return;
  CacheService.getScriptCache().remove("token:" + token);
}

// ==========================================
// Username Uniqueness (via Index)
// ==========================================

/**
 * Check if a username is globally taken using the username index.
 * Falls back to full scan if index doesn't exist yet.
 */
function isGlobalUsernameTaken(username) {
  if (!username) return false;
  const normalizedUsername = String(username).toLowerCase();
  
  const masterSS = getMasterDB();
  const indexSheet = masterSS.getSheetByName("username_index");
  
  if (indexSheet && indexSheet.getLastRow() > 1) {
    // Fast path: scan the index
    const indexHeaders = getHeaders(indexSheet);
    const indexRows = indexSheet.getDataRange().getValues();
    for (let i = 1; i < indexRows.length; i++) {
      if (String(indexRows[i][indexHeaders.indexOf("username")]).toLowerCase() === normalizedUsername) {
        return true;
      }
    }
    return false;
  }
  
  // Fallback: full scan (legacy path, should only be needed once before index is built)
  return isGlobalUsernameTakenLegacy(username);
}

function isGlobalUsernameTakenLegacy(username) {
  const normalizedUsername = String(username).toLowerCase();
  const masterSS = getMasterDB();
  const mSheet = masterSS.getSheetByName("staff");
  const headers = getHeaders(mSheet);
  const rows = mSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.username && String(rowObj.username).toLowerCase() === normalizedUsername) return true;
  }

  const sSheet = masterSS.getSheetByName("schools");
  const sHeaders = getHeaders(sSheet);
  const sRows = sSheet.getDataRange().getValues();
  for (let j = 1; j < sRows.length; j++) {
    let sRow = rowToObject(sRows[j], sHeaders);
    if (!sRow.spreadsheet_id) continue;
    try {
      const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
      const schoolMSheet = schoolSS.getSheetByName("members");
      if (!schoolMSheet) continue;
      let smHeaders = getHeaders(schoolMSheet);
      let smRows = schoolMSheet.getDataRange().getValues();
      for (let k = 1; k < smRows.length; k++) {
        let uRow = rowToObject(smRows[k], smHeaders);
        if (uRow.username && String(uRow.username).toLowerCase() === normalizedUsername) return true;
      }
    } catch(e) {}
  }
  return false;
}

/**
 * Add a username to the global index
 */
function addToUsernameIndex(username, memberId, schoolId) {
  if (!username) return;
  try {
    const masterSS = getMasterDB();
    let indexSheet = masterSS.getSheetByName("username_index");
    if (!indexSheet) return; // Index not yet created
    indexSheet.appendRow([String(username).toLowerCase(), memberId, schoolId || "MASTER", new Date().toISOString()]);
  } catch(e) {
    console.error("Failed to update username index:", e);
  }
}

function handleCheckUsername(data) {
  const { username } = data;
  if (!username) return { success: false, error: "Missing username" };
  const taken = isGlobalUsernameTaken(username);
  return { success: true, data: { available: !taken } };
}

// ==========================================
// Login
// ==========================================

function handleLogin(data) {
  const { email, password } = data;
  if (!email || !password) return { success: false, error: "Missing credentials" };

  const identifier = String(email).toLowerCase();
  // Hash with both new and legacy salt for backward compatibility
  const hashNew = hashPassword(password);
  const hashLegacy = hashPasswordLegacy(password);
  const masterSS = getMasterDB();
  const mSheet = masterSS.getSheetByName("staff");
  const headers = getHeaders(mSheet);
  const rows = mSheet.getDataRange().getValues();

  // 1. Check staff
  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (String(rowObj.email).toLowerCase() === identifier || String(rowObj.username).toLowerCase() === identifier) {
      // SECURITY FIX: Only accept hashed passwords, never plaintext
      if (rowObj.password === hashLegacy || rowObj.password === hashNew) {
        return buildLoginSuccess(mSheet, i + 1, headers, rowObj);
      } else {
        return { success: false, error: "Invalid credentials." };
      }
    }
  }

  // 2. Check schools
  const sSheet = masterSS.getSheetByName("schools");
  const sHeaders = getHeaders(sSheet);
  const sRows = sSheet.getDataRange().getValues();
  for (let j = 1; j < sRows.length; j++) {
    let sRow = rowToObject(sRows[j], sHeaders);
    if (!sRow.spreadsheet_id) continue;
    try {
      const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
      const schoolMSheet = schoolSS.getSheetByName("members");
      if (!schoolMSheet) continue;
      let smHeaders = getHeaders(schoolMSheet);
      let smRows = schoolMSheet.getDataRange().getValues();
      for (let k = 1; k < smRows.length; k++) {
        let uRow = rowToObject(smRows[k], smHeaders);
        if (String(uRow.email).toLowerCase() === identifier || String(uRow.username).toLowerCase() === identifier) {
          // SECURITY FIX: Only accept hashed passwords
          if (uRow.password === hashLegacy || uRow.password === hashNew) {
            return buildLoginSuccess(schoolMSheet, k + 1, smHeaders, uRow);
          } else {
            return { success: false, error: "Invalid credentials." };
          }
        }
      }
    } catch(e) {}
  }
  return { success: false, error: "Invalid credentials." };
}

function buildLoginSuccess(sheet, rowIndex, headers, rowObj) {
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  sheet.getRange(rowIndex, headers.indexOf("session_token") + 1).setValue(token);
  sheet.getRange(rowIndex, headers.indexOf("token_expiry") + 1).setValue(expiry.toISOString());
  delete rowObj.password;
  delete rowObj.session_token;

  // Cache the new token
  const userForCache = { ...rowObj, rowIndex: rowIndex, token_expiry: expiry.toISOString() };
  CacheService.getScriptCache().put("token:" + token, JSON.stringify(userForCache), 21600);

  return { success: true, data: { token: token, user: rowObj } };
}

// ==========================================
// Registration
// ==========================================

function handleRegister(data) {
  const { name, username, email, password, year_group_id, school_id, new_yg_year, new_yg_nickname, final_class, house_name, gender } = data;
  if (!name || !username || !email || !password || (!year_group_id && !new_yg_year) || !school_id) {
    return { success: false, error: "Missing required fields" };
  }

  if (isGlobalUsernameTaken(username)) {
    return { success: false, error: "Username is already taken" };
  }

  // Resolve school for CURRENT_SCHOOL_ID
  CURRENT_SCHOOL_ID = school_id;

  const membersSheet = getSheet("members", school_id);
  const headers = getHeaders(membersSheet);

  // Check email uniqueness
  const rows = membersSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.indexOf("email")]).toLowerCase() === email.toLowerCase()) {
      return { success: false, error: "Email already registered" };
    }
  }

  // Year group resolution
  const ygSheet = getSheet("year_groups", school_id);
  const ygHeaders = getHeaders(ygSheet);
  const ygRows = ygSheet.getDataRange().getValues();
  let cheque_color = "#1E293B";
  let yg_nickname = "";
  let assoc = "AMOSA";
  let actual_yg_id = year_group_id;

  if (year_group_id === "new_yg" && new_yg_year && new_yg_nickname) {
    actual_yg_id = Utilities.getUuid();
    yg_nickname = new_yg_nickname;

    // NOTE: Drive folder for YG created lazily on first upload (Phase 2 fix)
    ygSheet.appendRow([actual_yg_id, school_id, new_yg_year, new_yg_nickname, "", cheque_color, "", ""]);
  } else {
    for (let i = 1; i < ygRows.length; i++) {
      let ygRow = rowToObject(ygRows[i], ygHeaders);
      if (ygRow.id === year_group_id) {
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
    password: hashPasswordLegacy(password), // Use legacy hash for now for consistency
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
    priv_email: "yeargroup",
    priv_phone: "hidden",
    priv_location: "all",
    priv_profession: "all",
    priv_linkedin: "all",
    priv_bio: "yeargroup",
    priv_social: "yeargroup",
    bio: "", profession: "", location: "", phone: "", linkedin: "",
    social_links: "{}", cover_url: "", drive_folder_id: ""
  };

  const newRowArray = headers.map(h => newRowObj[h] !== undefined ? newRowObj[h] : "");
  membersSheet.appendRow(newRowArray);
  const newRowIndex = membersSheet.getLastRow();

  // Add to username index
  addToUsernameIndex(username, newId, school_id);

  // NOTE: Member Drive folder created lazily on first upload (Phase 2 fix)

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
    data: { token: token, user: newRowObj }
  };
}

function handleRegisterStaff(data) {
  const { name, username, email, password } = data;
  if (!name || !username || !email || !password) {
    return { success: false, error: "Missing required fields" };
  }

  if (isGlobalUsernameTaken(username)) {
    return { success: false, error: "Username is already taken" };
  }

  const masterSS = getMasterDB();
  const membersSheet = masterSS.getSheetByName("staff");
  const headers = getHeaders(membersSheet);

  const rows = membersSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.indexOf("email")]).toLowerCase() === email.toLowerCase()) {
      return { success: false, error: "Email already registered" };
    }
  }

  const newId = Utilities.getUuid();
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  const newRowObj = {
    id: newId, name: name, username: username,
    email: email.toLowerCase(),
    password: hashPasswordLegacy(password),
    role: "ICUNI Staff",
    year_group_id: "ICUNI_LABS", year_group_nickname: "ICUNI Labs",
    final_class: "N/A", house_name: "Administration", gender: "N/A",
    cheque_colour: "#0F172A", school: "ICUNI_LABS", association: "ICUNI Group",
    date_joined: new Date().toISOString(),
    session_token: token, token_expiry: expiry.toISOString(),
    priv_email: "all", priv_phone: "all", priv_location: "all",
    priv_profession: "all", priv_linkedin: "all", priv_bio: "all", priv_social: "all",
    bio: "Systems Administration", profession: "ICUNI Labs Staff", location: "Global",
    phone: "", linkedin: "", social_links: "{}", cover_url: ""
  };

  const newRowArray = headers.map(h => newRowObj[h] !== undefined ? newRowObj[h] : "");
  membersSheet.appendRow(newRowArray);
  const newRowIndex = membersSheet.getLastRow();

  // Add to username index
  addToUsernameIndex(username, newId, "MASTER");

  delete newRowObj.password;
  delete newRowObj.session_token;

  try {
    sendVerificationEmail(membersSheet, headers, newRowIndex, newRowObj.email, newRowObj.name);
  } catch (e) {
    console.error("Failed to dispatch verification: ", e);
  }

  return { success: true, data: { token: token, user: newRowObj } };
}

// ==========================================
// School Onboarding (Public, structured for future auth)
// ==========================================

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

  // Check email
  const rows = membersSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][headers.indexOf("email")]).toLowerCase() === email.toLowerCase()) {
      return { success: false, error: "Email already registered in Master" };
    }
  }

  // Flag similar school names for ICUNI Staff review
  const existingSchools = schoolsSheet.getDataRange().getValues();
  const normalizedNewName = String(new_school_name).toLowerCase().trim();
  let similarSchoolWarning = null;
  for (let s = 1; s < existingSchools.length; s++) {
    let existingRow = rowToObject(existingSchools[s], sHeaders);
    let existingName = String(existingRow.name || "").toLowerCase().trim();
    if (existingName && (existingName.includes(normalizedNewName) || normalizedNewName.includes(existingName) ||
        levenshteinSimilarity(existingName, normalizedNewName) > 0.7)) {
      similarSchoolWarning = "A school with a similar name already exists: '" + existingRow.name + "'. ICUNI Staff has been flagged to review.";
      break;
    }
  }

  const newId = Utilities.getUuid();
  const token = Utilities.getUuid();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  const newSchoolId = Utilities.getUuid();

  // Build Drive folder (school-level only — subfolders created lazily)
  const masterFolder = DriveApp.getFolderById(MASTER_FOLDER_ID);
  let schoolsBaseFolder;
  const schoolsIter = masterFolder.getFoldersByName("Schools");
  if (schoolsIter.hasNext()) {
    schoolsBaseFolder = schoolsIter.next();
  } else {
    schoolsBaseFolder = masterFolder.createFolder("Schools");
  }

  const schoolFolder = schoolsBaseFolder.createFolder(new_school_name + " [" + newSchoolId.substring(0, 8) + "]");

  // Generate School Spreadsheet
  const newSS = SpreadsheetApp.create(new_school_name + " Database");
  const ssId = newSS.getId();
  DriveApp.getFileById(ssId).moveTo(schoolFolder);
  INITIALIZE_SHEETS(newSS);

  // Save to Master Registry
  const schoolRowObj = {
    id: newSchoolId, name: new_school_name,
    association_name: new_association_name || "", association_short_name: new_association_short_name || "",
    motto: new_school_motto || "", colours: JSON.stringify(new_school_colours || []),
    cheque_representation: new_school_cheque_representation || "N/A",
    type: new_school_type, classes: JSON.stringify(new_school_classes || []),
    houses: JSON.stringify(new_school_houses || []),
    status: "Approved", admin_id: newId,
    spreadsheet_id: ssId, drive_folder_id: schoolFolder.getId()
  };
  schoolsSheet.appendRow(sHeaders.map(h => schoolRowObj[h] !== undefined ? schoolRowObj[h] : ""));

  // Save Admin User to School DB
  const schoolMembersSheet = newSS.getSheetByName("members");
  const newRowObj = {
    id: newId, name: name, username: username,
    email: email.toLowerCase(), password: hashPasswordLegacy(password),
    role: "School Administrator",
    year_group_id: "ADMIN", year_group_nickname: "School Executives",
    final_class: "", house_name: "", gender: "", cheque_colour: "#1E293B",
    school: newSchoolId, association: new_school_name,
    date_joined: new Date().toISOString(),
    session_token: token, token_expiry: expiry.toISOString(),
    school_admin_id: new_school_admin_id, verification_status: "Approved",
    priv_email: "all", priv_phone: "all", priv_location: "all",
    priv_profession: "all", priv_linkedin: "all", priv_bio: "all", priv_social: "all",
    bio: "School Administrator (Approved)",
    profession: "", location: "", phone: "", linkedin: "", social_links: "{}",
    cover_url: ""
  };

  const smHeaders = getHeaders(schoolMembersSheet);
  schoolMembersSheet.appendRow(smHeaders.map(h => newRowObj[h] !== undefined ? newRowObj[h] : ""));

  // Add to username index
  addToUsernameIndex(username, newId, newSchoolId);

  delete newRowObj.password;
  delete newRowObj.session_token;

  // Verification email
  try {
    sendVerificationEmail(schoolMembersSheet, smHeaders, schoolMembersSheet.getLastRow(), newRowObj.email, newRowObj.name);
  } catch (e) {
    console.error("Failed to dispatch verification: ", e);
  }

  const response = { success: true, data: { token: token, user: newRowObj } };
  if (similarSchoolWarning) {
    response.warnings = [similarSchoolWarning];
  }
  return response;
}

/**
 * Basic similarity check for school name deduplication
 */
function levenshteinSimilarity(a, b) {
  if (a === b) return 1.0;
  const la = a.length, lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const maxLen = Math.max(la, lb);
  // Simple character overlap ratio
  let common = 0;
  const aChars = a.split('');
  const bArr = b.split('');
  aChars.forEach(ch => {
    const idx = bArr.indexOf(ch);
    if (idx !== -1) { common++; bArr.splice(idx, 1); }
  });
  return common / maxLen;
}

// ==========================================
// Password Management
// ==========================================

function changePassword(user, data, schoolId) {
  const { old_password, new_password, confirm_password } = data;
  if (!old_password || !new_password || !confirm_password) return { success: false, error: "Missing fields" };
  if (new_password !== confirm_password) return { success: false, error: "Passwords do not match" };

  const cached = getCachedSheetData("members", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;

  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.id === user.id) {
      // Check against both hash methods
      if (rowObj.password !== hashPasswordLegacy(old_password) && rowObj.password !== hashPassword(old_password, user.id)) {
        return { success: false, error: "Incorrect old password" };
      }
      sheet.getRange(i + 1, headers.indexOf("password") + 1).setValue(hashPasswordLegacy(new_password));
      // Invalidate token cache since password changed
      if (user.session_token) invalidateTokenCache(user.session_token);
      invalidateCache("members", schoolId);
      return { success: true, message: "Password updated successfully" };
    }
  }
  return { success: false, error: "User not found in database" };
}

function handleResetPassword(data) {
  const { email } = data;
  if (!email) return { success: false, error: "Missing email address" };

  const masterSS = getMasterDB();
  const mSheet = masterSS.getSheetByName("staff");
  let headers = getHeaders(mSheet);
  let rows = mSheet.getDataRange().getValues();
  let foundSheet = null, foundRowIndex = -1, foundRowObj = null;

  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.email && rowObj.email.toLowerCase() === email.toLowerCase()) {
      foundSheet = mSheet; foundRowIndex = i + 1; foundRowObj = rowObj;
      break;
    }
  }

  if (!foundSheet) {
    const sSheet = masterSS.getSheetByName("schools");
    const sHeaders = getHeaders(sSheet);
    const sRows = sSheet.getDataRange().getValues();
    for (let j = 1; j < sRows.length; j++) {
      let sRow = rowToObject(sRows[j], sHeaders);
      if (!sRow.spreadsheet_id) continue;
      try {
        const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
        const schoolMSheet = schoolSS.getSheetByName("members");
        if (!schoolMSheet) continue;
        let smHeaders = getHeaders(schoolMSheet);
        let smRows = schoolMSheet.getDataRange().getValues();
        for (let k = 1; k < smRows.length; k++) {
          let uRow = rowToObject(smRows[k], smHeaders);
          if (uRow.email && String(uRow.email).toLowerCase() === String(email).toLowerCase()) {
            foundSheet = schoolMSheet; headers = smHeaders;
            foundRowIndex = k + 1; foundRowObj = uRow;
            break;
          }
        }
        if (foundSheet) break;
      } catch(e) {}
    }
  }

  if (!foundSheet) return { success: false, error: "Email address not found" };

  const resetToken = Utilities.getUuid();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);

  let rtCol = headers.indexOf("reset_token");
  if (rtCol === -1) {
    foundSheet.getRange(1, headers.length + 1).setValue("reset_token");
    headers.push("reset_token"); rtCol = headers.length - 1;
  }
  let rtexpCol = headers.indexOf("reset_token_expiry");
  if (rtexpCol === -1) {
    foundSheet.getRange(1, headers.length + 1).setValue("reset_token_expiry");
    headers.push("reset_token_expiry"); rtexpCol = headers.length - 1;
  }

  foundSheet.getRange(foundRowIndex, rtCol + 1).setValue(resetToken);
  foundSheet.getRange(foundRowIndex, rtexpCol + 1).setValue(expiry.toISOString());

  const verifyUrl = PRODUCTION_URL + "/reset-password?token=" + resetToken;
  const subject = "Reset your password — OSA Platform";
  const emailHtml = '<div style="font-family: \'Segoe UI\', sans-serif; color: #1E293B; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #E2E8F0; border-radius: 12px; background: #FFFFFF;">' +
    '<h2 style="color: #2D88FF; margin: 0; font-size: 24px; text-align: center;">Password Reset</h2>' +
    '<hr style="border: none; border-top: 1px solid #E2E8F0; margin: 16px 0;" />' +
    '<p>Hello <strong>' + foundRowObj.name + '</strong>,</p>' +
    '<p>We received a request to reset your password. Click the button below to choose a new password. This link will expire in 1 hour.</p>' +
    '<div style="text-align: center; margin: 32px 0;">' +
      '<a href="' + verifyUrl + '" style="background-color: #2D88FF; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">Reset Password</a>' +
    '</div></div>';

  try {
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: emailHtml, name: "OSA Platform" });
    return { success: true, message: "Password reset link sent to " + email };
  } catch(e) {
    return { success: false, error: "Failed to send email." };
  }
}

function handleCompletePasswordReset(data) {
  const { token, new_password } = data;
  if (!token || !new_password) return { success: false, error: "Missing token or password" };

  const masterSS = getMasterDB();
  let foundSheet = null, foundRowIndex = -1, headers = null;

  const mSheet = masterSS.getSheetByName("staff");
  let mHeaders = getHeaders(mSheet);
  let mRows = mSheet.getDataRange().getValues();
  for (let i = 1; i < mRows.length; i++) {
    if (rowToObject(mRows[i], mHeaders).reset_token === token) {
      foundSheet = mSheet; headers = mHeaders; foundRowIndex = i + 1; break;
    }
  }

  if (!foundSheet) {
    const sSheet = masterSS.getSheetByName("schools");
    const sHeaders = getHeaders(sSheet);
    const sRows = sSheet.getDataRange().getValues();
    for (let j = 1; j < sRows.length; j++) {
      let sRow = rowToObject(sRows[j], sHeaders);
      if (!sRow.spreadsheet_id) continue;
      try {
        const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
        const schoolMSheet = schoolSS.getSheetByName("members");
        if (!schoolMSheet) continue;
        let smHeaders = getHeaders(schoolMSheet);
        let smRows = schoolMSheet.getDataRange().getValues();
        for (let k = 1; k < smRows.length; k++) {
          if (rowToObject(smRows[k], smHeaders).reset_token === token) {
            foundSheet = schoolMSheet; headers = smHeaders; foundRowIndex = k + 1; break;
          }
        }
        if (foundSheet) break;
      } catch(e) {}
    }
  }

  if (!foundSheet) return { success: false, error: "Invalid or expired token" };

  let rObj = rowToObject(foundSheet.getRange(foundRowIndex, 1, 1, headers.length).getValues()[0], headers);
  if (new Date() > new Date(rObj.reset_token_expiry)) {
    return { success: false, error: "Token has expired" };
  }

  foundSheet.getRange(foundRowIndex, headers.indexOf("password") + 1).setValue(hashPasswordLegacy(new_password));
  let resetTokenIdx = headers.indexOf("reset_token");
  if (resetTokenIdx !== -1) foundSheet.getRange(foundRowIndex, resetTokenIdx + 1).setValue("");

  return { success: true, message: "Password updated successfully" };
}

// ==========================================
// OTP Login (Passwordless — Email Code)
// ==========================================
//
// Security:
//   • 6-digit OTP, cryptographically generated
//   • Expires in 5 minutes (CacheService)
//   • Max 3 verification attempts per OTP
//   • Max 5 send requests per email per hour (rate limit)
//   • Timing-safe: same response whether email exists or not

function handleSendOTP(data) {
  const { email } = data;
  if (!email) return { success: false, error: "Please enter your email or username." };
  const identifier = String(email).toLowerCase();

  // Rate limit: max 5 OTP sends per identifier per hour
  const cache = CacheService.getScriptCache();
  const sendCountKey = 'otp_send_' + identifier;
  const sendCount = Number(cache.get(sendCountKey)) || 0;
  if (sendCount >= 5) {
    return { success: false, error: "Too many login attempts. Please wait an hour before trying again." };
  }

  // Find user across all databases
  const found = findUserAcrossDBs_(identifier);
  if (!found) {
    // Don't reveal whether the email exists — same delay + response
    Utilities.sleep(1500);
    return { success: true, data: { message: "If this email is registered, a login code has been sent." } };
  }

  // Generate 6-digit numeric OTP
  const otp = generateSecureOTP_();

  // Store OTP in cache (5-minute TTL)
  const otpData = JSON.stringify({
    otp: otp,
    identifier: identifier,
    sheetId: found.sheetId,
    rowIndex: found.rowIndex,
    name: found.rowObj.name,
    email: found.rowObj.email,
    attempts: 0,
    created: new Date().toISOString()
  });
  cache.put('otp_' + identifier, otpData, 300); // 5 minutes

  // Increment send counter
  cache.put(sendCountKey, String(sendCount + 1), 3600); // 1 hour window

  // Send the OTP via email
  try {
    const emailHtml = buildOTPEmail_(otp, found.rowObj.name);
    MailApp.sendEmail({
      to: found.rowObj.email,
      subject: 'OSA Platform — Your Login Code',
      htmlBody: emailHtml,
      name: 'OSA Platform'
    });
  } catch (mailErr) {
    console.error('OTP email failed:', mailErr);
    return { success: false, error: "Failed to send login code. Please try again." };
  }

  logAction('OTP_SENT', found.rowObj.id || 'unknown', 'Login code sent to: ' + found.rowObj.email);

  return { success: true, data: { message: "If this email is registered, a login code has been sent." } };
}

function handleVerifyOTP(data) {
  const { email, otp } = data;
  if (!email || !otp) return { success: false, error: "Email and code are required." };
  const identifier = String(email).toLowerCase();
  const submittedOTP = String(otp).trim();

  const cache = CacheService.getScriptCache();
  const otpDataStr = cache.get('otp_' + identifier);

  if (!otpDataStr) {
    return { success: false, error: "Login code has expired. Please request a new one." };
  }

  const otpData = JSON.parse(otpDataStr);

  // Check brute force attempts
  if (otpData.attempts >= 3) {
    cache.remove('otp_' + identifier);
    logAction('OTP_BRUTE_FORCE', 'system', 'Max attempts exceeded for: ' + identifier);
    return { success: false, error: "Too many incorrect attempts. Please request a new code." };
  }

  // Verify OTP
  if (otpData.otp !== submittedOTP) {
    otpData.attempts++;
    cache.put('otp_' + identifier, JSON.stringify(otpData), 300);
    const remaining = 3 - otpData.attempts;
    return {
      success: false,
      error: 'Incorrect code. ' + remaining + ' attempt' + (remaining === 1 ? '' : 's') + ' remaining.'
    };
  }

  // ✅ OTP is correct — consume it
  cache.remove('otp_' + identifier);

  // Re-find the user to build session (we need the sheet reference)
  const found = findUserAcrossDBs_(identifier);
  if (!found) {
    return { success: false, error: "Account not found." };
  }

  logAction('OTP_LOGIN', found.rowObj.id || 'unknown', 'OTP login for: ' + found.rowObj.email);
  return buildLoginSuccess(found.sheet, found.rowIndex, found.headers, found.rowObj);
}


// ==========================================
// PIN Login (4-Digit Quick Access)
// ==========================================
//
// Security:
//   • Stored in PropertiesService as "osa_pin_<email>" = "salt:hash"
//   • SHA-256 hashed with unique random salt
//   • 3 failed attempts = 15-minute lockout
//   • Requires valid session to set/change

var PIN_MAX_ATTEMPTS = 3;
var PIN_LOCKOUT_SECONDS = 900; // 15 minutes

function handlePinLogin(data) {
  const { email, pin } = data;
  if (!email || !pin) return { success: false, error: "Email and PIN are required." };
  if (!/^\d{4}$/.test(String(pin))) return { success: false, error: "PIN must be exactly 4 digits." };
  const identifier = String(email).toLowerCase();

  const cache = CacheService.getScriptCache();
  const lockKey = 'pin_lock_' + identifier;
  if (cache.get(lockKey)) {
    return { success: false, error: "Account temporarily locked. Wait 15 minutes or use another login method." };
  }

  const attemptKey = 'pin_fail_' + identifier;
  let failCount = Number(cache.get(attemptKey)) || 0;

  const found = findUserAcrossDBs_(identifier);
  if (!found) {
    Utilities.sleep(1000);
    return { success: false, error: "Invalid email or PIN." };
  }

  const storedHash = PropertiesService.getScriptProperties().getProperty('osa_pin_' + found.rowObj.email.toLowerCase());
  if (!storedHash) {
    return { success: false, error: "No PIN set. Use password or email code to log in, then set a PIN from your profile." };
  }

  if (!verifyPinHash_(String(pin), storedHash)) {
    failCount++;
    if (failCount >= PIN_MAX_ATTEMPTS) {
      cache.put(lockKey, 'locked', PIN_LOCKOUT_SECONDS);
      cache.remove(attemptKey);
      logAction('PIN_LOCKOUT', found.rowObj.id || 'unknown', 'PIN locked after ' + PIN_MAX_ATTEMPTS + ' fails: ' + identifier);
      return { success: false, error: "Too many failed attempts. Account locked for 15 minutes." };
    }
    cache.put(attemptKey, String(failCount), 3600);
    const remaining = PIN_MAX_ATTEMPTS - failCount;
    Utilities.sleep(500 * failCount);
    return { success: false, error: 'Invalid PIN. ' + remaining + ' attempt' + (remaining === 1 ? '' : 's') + ' remaining.' };
  }

  // ✅ PIN correct
  cache.remove(attemptKey);
  logAction('PIN_LOGIN', found.rowObj.id || 'unknown', 'PIN-based login');
  return buildLoginSuccess(found.sheet, found.rowIndex, found.headers, found.rowObj);
}

function handleSetPin(user, data) {
  const { pin } = data;
  if (!pin || !/^\d{4}$/.test(String(pin))) {
    return { success: false, error: "PIN must be exactly 4 digits." };
  }

  const hashedPin = hashPin_(String(pin));
  PropertiesService.getScriptProperties().setProperty('osa_pin_' + user.email.toLowerCase(), hashedPin);
  logAction('PIN_SET', user.id || 'unknown', 'PIN set for: ' + user.email);
  return { success: true, data: { message: "Login PIN set successfully." } };
}

function handleDeletePin(user, data) {
  PropertiesService.getScriptProperties().deleteProperty('osa_pin_' + user.email.toLowerCase());
  logAction('PIN_DELETED', user.id || 'unknown', 'PIN removed for: ' + user.email);
  return { success: true, data: { message: "Login PIN removed." } };
}

function handleCheckHasPin(data) {
  const { email } = data;
  if (!email) return { success: false, error: "Email is required." };
  const identifier = String(email).toLowerCase();

  // Find the user to resolve their actual email
  const found = findUserAcrossDBs_(identifier);
  if (!found) {
    // Don't reveal if user exists
    return { success: true, data: { hasPin: false } };
  }

  const storedHash = PropertiesService.getScriptProperties().getProperty('osa_pin_' + found.rowObj.email.toLowerCase());
  return { success: true, data: { hasPin: !!storedHash } };
}


// ==========================================
// Auth Helpers — OTP & PIN
// ==========================================

/**
 * Generate a cryptographically random 6-digit OTP.
 */
function generateSecureOTP_() {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + new Date().getTime() + Math.random()
  );
  const num = Math.abs(bytes[0] * 16777216 + bytes[1] * 65536 + bytes[2] * 256 + bytes[3]);
  let otp = String(num % 1000000);
  while (otp.length < 6) otp = '0' + otp;
  return otp;
}

/**
 * Hash a PIN with a unique random salt.
 * Returns "salt:hash"
 */
function hashPin_(pin) {
  const salt = Utilities.getUuid().replace(/-/g, '');
  const raw = salt + pin;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  const hash = digest.map(function(b) {
    return ('0' + ((b + 256) % 256).toString(16)).slice(-2);
  }).join('');
  return salt + ':' + hash;
}

/**
 * Verify a PIN against a stored "salt:hash" value.
 */
function verifyPinHash_(pin, storedHash) {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const salt = parts[0];
  const expected = parts[1];
  const raw = salt + pin;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  const recomputed = digest.map(function(b) {
    return ('0' + ((b + 256) % 256).toString(16)).slice(-2);
  }).join('');
  return recomputed === expected;
}

/**
 * Find a user across staff and all school member sheets.
 * Returns { sheet, headers, rowIndex, rowObj, sheetId } or null.
 * Matches by email or username.
 */
function findUserAcrossDBs_(identifier) {
  const normalId = String(identifier).toLowerCase();
  const masterSS = getMasterDB();

  // 1. Check staff
  const mSheet = masterSS.getSheetByName("staff");
  const mHeaders = getHeaders(mSheet);
  const mRows = mSheet.getDataRange().getValues();
  for (let i = 1; i < mRows.length; i++) {
    const rowObj = rowToObject(mRows[i], mHeaders);
    if (String(rowObj.email).toLowerCase() === normalId || String(rowObj.username).toLowerCase() === normalId) {
      return { sheet: mSheet, headers: mHeaders, rowIndex: i + 1, rowObj: rowObj, sheetId: MASTER_DB_ID };
    }
  }

  // 2. Check school member sheets
  const sSheet = masterSS.getSheetByName("schools");
  const sHeaders = getHeaders(sSheet);
  const sRows = sSheet.getDataRange().getValues();
  for (let j = 1; j < sRows.length; j++) {
    const sRow = rowToObject(sRows[j], sHeaders);
    if (!sRow.spreadsheet_id) continue;
    try {
      const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
      const schoolMSheet = schoolSS.getSheetByName("members");
      if (!schoolMSheet) continue;
      const smHeaders = getHeaders(schoolMSheet);
      const smRows = schoolMSheet.getDataRange().getValues();
      for (let k = 1; k < smRows.length; k++) {
        const uRow = rowToObject(smRows[k], smHeaders);
        if (String(uRow.email).toLowerCase() === normalId || String(uRow.username).toLowerCase() === normalId) {
          return { sheet: schoolMSheet, headers: smHeaders, rowIndex: k + 1, rowObj: uRow, sheetId: sRow.spreadsheet_id };
        }
      }
    } catch(e) {}
  }

  return null;
}

/**
 * Build a beautiful HTML email body for OTP delivery.
 * Styled to match OSA's purple/gold brand.
 */
function buildOTPEmail_(otp, name) {
  const digits = otp.split('');
  const digitBoxes = digits.map(function(d) {
    return '<td style="width:44px;height:52px;text-align:center;font-family:\'SF Mono\',Consolas,monospace;' +
      'font-size:28px;font-weight:700;color:#9966CC;background:#f8f5ff;border:2px solid #e0d4f5;' +
      'border-radius:10px;letter-spacing:0;">' + d + '</td>';
  }).join('<td style="width:6px;"></td>');

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>' +
    '<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;"><tr><td align="center">' +
    '<table width="460" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">' +

    // Header
    '<tr><td style="padding:32px 32px 0;text-align:center;">' +
    '<div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;"><span style="color:#9966CC;">O</span><span style="color:#DAA520;">S</span><span style="color:#9966CC;">A</span></div>' +
    '<div style="font-size:12px;color:#94a3b8;margin-top:4px;letter-spacing:3px;text-transform:uppercase;">SECURE LOGIN</div>' +
    '</td></tr>' +

    // Greeting
    '<tr><td style="padding:28px 32px 0;color:#1e293b;font-size:16px;">' +
    'Hi <strong>' + (name || 'there') + '</strong>,</td></tr>' +

    // Message
    '<tr><td style="padding:12px 32px;color:#64748b;font-size:14px;line-height:1.6;">' +
    'Enter this code to log in to your OSA community. It expires in <strong style="color:#1e293b;">5 minutes</strong>.</td></tr>' +

    // OTP Code
    '<tr><td style="padding:20px 32px;" align="center">' +
    '<table cellpadding="0" cellspacing="0"><tr>' + digitBoxes + '</tr></table>' +
    '</td></tr>' +

    // Security note
    '<tr><td style="padding:16px 32px;text-align:center;">' +
    '<div style="display:inline-block;padding:8px 16px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;font-size:12px;color:#dc2626;">' +
    '⚠️ Never share this code with anyone. Our team will never ask for it.' +
    '</div></td></tr>' +

    // Footer
    '<tr><td style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px;">' +
    'If you didn\'t request this code, you can safely ignore this email.<br>' +
    '<span style="color:#cbd5e1;">OSA Platform — Old Students Association Network • ICUNI Labs</span>' +
    '</td></tr>' +

    '</table></td></tr></table></body></html>';
}

// ==========================================
// Email Verification
// ==========================================

function sendVerificationEmail(sheet, headers, rowIndex, recipientEmail, userName) {
  const verifyToken = Utilities.getUuid();

  let vtCol = headers.indexOf("verification_token");
  if (vtCol === -1) {
    sheet.getRange(1, headers.length + 1).setValue("verification_token");
    headers.push("verification_token"); vtCol = headers.length - 1;
  }
  let evCol = headers.indexOf("email_verified");
  if (evCol === -1) {
    sheet.getRange(1, headers.length + 1).setValue("email_verified");
    headers.push("email_verified"); evCol = headers.length - 1;
  }

  sheet.getRange(rowIndex, vtCol + 1).setValue(verifyToken);
  sheet.getRange(rowIndex, evCol + 1).setValue("false");

  const verifyUrl = PRODUCTION_URL + "/verify?token=" + verifyToken;
  const subject = "Verify your email \u2014 OSA Platform";
  const emailHtml = '<div style="font-family: \'Segoe UI\', sans-serif; color: #1E293B; max-width: 600px; margin: 0 auto; padding: 32px; border: 1px solid #E2E8F0; border-radius: 12px; background: #FFFFFF;">' +
    '<div style="text-align: center; margin-bottom: 24px;">' +
      '<h2 style="color: #2D88FF; margin: 0; font-size: 24px;">OSA Platform</h2>' +
      '<p style="color: #94A3B8; font-size: 13px; margin: 4px 0 0;">Old Students Association Network</p>' +
    '</div><hr style="border: none; border-top: 1px solid #E2E8F0; margin: 16px 0;" />' +
    '<p style="font-size: 16px;">Hello <strong>' + userName + '</strong>,</p>' +
    '<p style="font-size: 14px; line-height: 1.6; color: #475569;">Thank you for registering. Please verify your email address by clicking the button below.</p>' +
    '<div style="text-align: center; margin: 32px 0;">' +
      '<a href="' + verifyUrl + '" style="background-color: #2D88FF; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">Verify Email Address</a>' +
    '</div>' +
    '<p style="font-size: 12px; color: #94A3B8; text-align: center;">If the button doesn\'t work, copy and paste this link: ' + verifyUrl + '</p>' +
    '<hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />' +
    '<p style="font-size: 12px; color: #94A3B8;">\u2014 OSA Platform Security \u2022 ICUNI Labs</p></div>';

  MailApp.sendEmail({ to: recipientEmail, subject: subject, htmlBody: emailHtml, name: "OSA Platform", replyTo: "donotreply@icuni.org" });
}

function handleResendVerification(data) {
  const { email, target_school_id } = data;
  if (!email) return { success: false, error: "Missing email address" };
  const schoolId = target_school_id || CURRENT_SCHOOL_ID;

  const membersSheet = getSheet("members", schoolId);
  const headers = getHeaders(membersSheet);
  const rows = membersSheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.email && rowObj.email.toLowerCase() === email.toLowerCase()) {
      try {
        sendVerificationEmail(membersSheet, headers, i + 1, rowObj.email, rowObj.name);
        return { success: true, message: "Verification email sent to " + email };
      } catch (e) {
        return { success: false, error: "Failed to send verification email." };
      }
    }
  }
  return { success: false, error: "Email address not found" };
}

function handleVerifyEmail(data) {
  const { token } = data;
  if (!token) return { success: false, error: "Missing verification token" };

  // Check all databases for the token
  const masterSS = getMasterDB();
  
  // Check staff first  
  const staffSheet = masterSS.getSheetByName("staff");
  let result = _verifyEmailInSheet(staffSheet, token);
  if (result) return result;
  
  // Check all school DBs
  const sSheet = masterSS.getSheetByName("schools");
  const sHeaders = getHeaders(sSheet);
  const sRows = sSheet.getDataRange().getValues();
  for (let j = 1; j < sRows.length; j++) {
    let sRow = rowToObject(sRows[j], sHeaders);
    if (!sRow.spreadsheet_id) continue;
    try {
      const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
      const schoolMSheet = schoolSS.getSheetByName("members");
      if (!schoolMSheet) continue;
      result = _verifyEmailInSheet(schoolMSheet, token);
      if (result) return result;
    } catch(e) {}
  }
  
  return { success: false, error: "Invalid or expired verification link" };
}

function _verifyEmailInSheet(sheet, token) {
  if (!sheet) return null;
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  
  let evCol = headers.indexOf("email_verified");
  if (evCol === -1) return null;
  let vtCol = headers.indexOf("verification_token");
  if (vtCol === -1) return null;
  
  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (rowObj.verification_token && rowObj.verification_token === token) {
      sheet.getRange(i + 1, evCol + 1).setValue("true");
      sheet.getRange(i + 1, vtCol + 1).setValue("");
      
      delete rowObj.password;
      delete rowObj.session_token;
      rowObj.email_verified = true;
      
      return { success: true, data: rowObj };
    }
  }
  return null;
}
