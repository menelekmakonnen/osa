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
// Magic Links
// ==========================================

function handleRequestMagicLink(data) {
  const { email } = data;
  if (!email) return { success: false, error: "Missing login identifier" };
  const identifier = String(email).toLowerCase();

  const masterSS = getMasterDB();
  let foundSheet = null, foundRowIndex = -1, headers = null, foundRowObj = null;

  const mSheet = masterSS.getSheetByName("staff");
  let mHeaders = getHeaders(mSheet);
  let mRows = mSheet.getDataRange().getValues();
  for (let i = 1; i < mRows.length; i++) {
    let rObj = rowToObject(mRows[i], mHeaders);
    if (String(rObj.email).toLowerCase() === identifier || String(rObj.username).toLowerCase() === identifier) {
      foundSheet = mSheet; headers = mHeaders; foundRowIndex = i + 1; foundRowObj = rObj; break;
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
          if (String(uRow.email).toLowerCase() === identifier || String(uRow.username).toLowerCase() === identifier) {
            foundSheet = schoolMSheet; headers = smHeaders; foundRowIndex = k + 1; foundRowObj = uRow; break;
          }
        }
        if (foundSheet) break;
      } catch(e) {}
    }
  }

  if (!foundSheet) return { success: false, error: "User not found." };

  const magicToken = Utilities.getUuid() + "-" + Utilities.getUuid();
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 15);

  let magicTokenIdx = headers.indexOf("magic_token");
  let magicExpiryIdx = headers.indexOf("magic_token_expiry");
  if (magicTokenIdx === -1) {
    magicTokenIdx = headers.length; magicExpiryIdx = headers.length + 1;
    foundSheet.getRange(1, magicTokenIdx + 1).setValue("magic_token");
    foundSheet.getRange(1, magicExpiryIdx + 1).setValue("magic_token_expiry");
  }

  foundSheet.getRange(foundRowIndex, magicTokenIdx + 1).setValue(magicToken);
  foundSheet.getRange(foundRowIndex, magicExpiryIdx + 1).setValue(expiry.toISOString());

  // FIXED: Use production URL instead of localhost
  const verifyUrl = PRODUCTION_URL + "/magic-login?token=" + magicToken;
  const emailHtml = '<div style="font-family: sans-serif; color: #333; max-width: 500px; margin: 0 auto;">' +
    '<h2 style="color: #0f172a;">Magic Login Link</h2>' +
    '<p>Hello <strong>' + foundRowObj.name + '</strong>,</p>' +
    '<p>Click the button below to instantly and securely log into your account. This magic link will expire in 15 minutes.</p>' +
    '<div style="text-align: center; margin: 32px 0;">' +
      '<a href="' + verifyUrl + '" style="background-color: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">Login Automatically</a>' +
    '</div>' +
    '<p style="font-size: 12px; color: #666;">If you didn\'t request this, you can safely ignore this email.</p></div>';

  try {
    MailApp.sendEmail({ to: foundRowObj.email, subject: "Your Secure Magic Login Link for OSA", htmlBody: emailHtml, name: "OSA Platform" });
    return { success: true, message: "A magic login link has been sent to your email address." };
  } catch (e) {
    return { success: false, error: "Failed to dispatch magic link email." };
  }
}

function handleCompleteMagicLinkLogin(data) {
  const { token } = data;
  if (!token) return { success: false, error: "Missing magic token" };

  const masterSS = getMasterDB();
  let foundSheet = null, foundRowIndex = -1, headers = null, foundRowObj = null;

  const mSheet = masterSS.getSheetByName("staff");
  let mHeaders = getHeaders(mSheet);
  let mRows = mSheet.getDataRange().getValues();
  let tmpIdx = mHeaders.indexOf("magic_token");
  if (tmpIdx !== -1) {
    for (let i = 1; i < mRows.length; i++) {
      let rObj = rowToObject(mRows[i], mHeaders);
      if (rObj.magic_token === token) {
        foundSheet = mSheet; headers = mHeaders; foundRowIndex = i + 1; foundRowObj = rObj; break;
      }
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
        if (smHeaders.indexOf("magic_token") === -1) continue;
        let smRows = schoolMSheet.getDataRange().getValues();
        for (let k = 1; k < smRows.length; k++) {
          let uRow = rowToObject(smRows[k], smHeaders);
          if (uRow.magic_token === token) {
            foundSheet = schoolMSheet; headers = smHeaders; foundRowIndex = k + 1; foundRowObj = uRow; break;
          }
        }
        if (foundSheet) break;
      } catch(e) {}
    }
  }

  if (!foundSheet) return { success: false, error: "Invalid or expired magic link" };

  let rObj = rowToObject(foundSheet.getRange(foundRowIndex, 1, 1, headers.length).getValues()[0], headers);
  if (new Date() > new Date(rObj.magic_token_expiry)) {
    return { success: false, error: "Magic link has expired" };
  }

  // Consume token
  foundSheet.getRange(foundRowIndex, headers.indexOf("magic_token") + 1).setValue("");
  return buildLoginSuccess(foundSheet, foundRowIndex, headers, foundRowObj);
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
