/**
 * OSA Platform — ICUNI Labs Cockpit (Admin Functions)
 * Contains: system overview, staff management, school management,
 *           raw sheet access, member overrides, feature flags,
 *           provisioning, migration utilities
 * 
 * ALL functions require Platform Staff (T4) authorization.
 */

// ==========================================
// System Overview
// ==========================================

function getSystemOverview(user) {
  enforceMinTier(user, 4, "getSystemOverview");

  const members = getSheetData("members", CURRENT_SCHOOL_ID);
  const schools = getSheetData("schools", CURRENT_SCHOOL_ID);
  const tickets = getSheetData("tickets", CURRENT_SCHOOL_ID);
  const posts = getSheetData("posts", CURRENT_SCHOOL_ID);

  const openTickets = tickets.filter(t => t.status !== "Resolved");
  const escalatedTickets = tickets.filter(t => t.status === "Escalated");
  const pendingPosts = posts.filter(p => p.status === "Pending");

  const schoolSummaries = schools.map(s => {
    const schoolMembers = members.filter(m => m.school === s.id);
    const schoolTickets = tickets.filter(t => t.school === s.id && t.status !== "Resolved");
    return {
      id: s.id, name: s.name, status: s.status || "Active",
      memberCount: schoolMembers.length, openTicketCount: schoolTickets.length
    };
  });

  const recentActivity = [];
  tickets.slice(-5).reverse().forEach(t => {
    recentActivity.push({ type: "ticket", label: t.issue_type, actor: t.author_name, status: t.status, school: t.school, date: t.created_at });
  });
  posts.slice(-5).reverse().forEach(p => {
    recentActivity.push({ type: "post", label: p.title, actor: p.author_name, status: p.status, school: p.school, date: p.submission_date });
  });
  recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    success: true,
    data: {
      totalSchools: schools.length, totalMembers: members.length,
      openTickets: openTickets.length, escalatedTickets: escalatedTickets.length,
      pendingPosts: pendingPosts.length,
      staffCount: members.filter(m => m.role === "IT Department" || m.role === "ICUNI Staff").length,
      schools: schoolSummaries,
      escalatedTicketsList: escalatedTickets.map(t => ({
        id: t.id, issue_type: t.issue_type, description: t.description,
        author_name: t.author_name, school: t.school, current_tier: t.current_tier,
        status: t.status, created_at: t.created_at
      })),
      recentActivity: recentActivity.slice(0, 10)
    }
  };
}

// ==========================================
// Staff Management
// ==========================================

function getStaffRoster(user) {
  enforceMinTier(user, 4, "getStaffRoster");
  const members = getSheetData("members", CURRENT_SCHOOL_ID);
  const staff = members.filter(m => m.role === "IT Department" || m.role === "ICUNI Staff");
  return {
    success: true,
    data: staff.map(s => ({
      id: s.id, name: s.name, email: s.email, role: s.role,
      date_joined: s.date_joined, profile_pic: s.profile_pic || "",
      bio: s.bio || "", profession: s.profession || ""
    }))
  };
}

function addStaffMember(user, data) {
  enforceMinTier(user, 4, "addStaffMember");
  const { name, email, password } = data;
  if (!name || !email || !password) return { success: false, error: "Missing required fields" };

  const ms = getSheet("members", CURRENT_SCHOOL_ID);
  const mh = getHeaders(ms);
  const rows = ms.getDataRange().getValues();

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
    id: newId, name: name,
    username: name.toLowerCase().replace(/\s+/g, '.'),
    email: email,
    password: hashPasswordLegacy(password), // SECURITY FIX: Hash the password
    role: "IT Department",
    year_group_id: "ADMIN", year_group_nickname: "School Executives",
    cheque_colour: "#0F172A", school: targetSchool,
    association: targetSchoolName, date_joined: now,
    email_verified: "true", id_verified: "true",
    verification_status: "Approved",
    priv_email: "all", priv_phone: "all", priv_location: "all",
    priv_profession: "all", priv_linkedin: "all", priv_bio: "all", priv_social: "all"
  };

  ms.appendRow(mh.map(h => staffRow[h] !== undefined ? staffRow[h] : ""));
  
  // Add to username index
  addToUsernameIndex(staffRow.username, newId, "MASTER");
  invalidateCache("members", CURRENT_SCHOOL_ID);

  return { success: true, data: { id: newId, name, email, role: "IT Department" } };
}

function removeStaffMember(user, data) {
  enforceMinTier(user, 4, "removeStaffMember");
  const { userId } = data;
  if (!userId) return { success: false, error: "Missing userId" };
  if (userId === user.id) return { success: false, error: "Cannot remove yourself" };

  const ms = getSheet("members", CURRENT_SCHOOL_ID);
  const mh = getHeaders(ms);
  const rows = ms.getDataRange().getValues();
  const roleCol = mh.indexOf("role");

  for (let i = 1; i < rows.length; i++) {
    const row = rowToObject(rows[i], mh);
    if (row.id === userId && (row.role === "IT Department" || row.role === "ICUNI Staff")) {
      ms.getRange(i + 1, roleCol + 1).setValue("Member");
      invalidateCache("members", CURRENT_SCHOOL_ID);
      return { success: true, message: row.name + " has been removed from IT Department" };
    }
  }
  return { success: false, error: "Staff member not found" };
}

// ==========================================
// School Management
// ==========================================

function removeSchool(user, data) {
  enforceMinTier(user, 4, "removeSchool");
  const { schoolId } = data;
  if (!schoolId) return { success: false, error: "Missing schoolId" };

  const ss = getSheet("schools", CURRENT_SCHOOL_ID);
  const sh = getHeaders(ss);
  const rows = ss.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const row = rowToObject(rows[i], sh);
    if (row.id === schoolId) {
      ss.deleteRow(i + 1);
      invalidateCache("schools", CURRENT_SCHOOL_ID);
      return { success: true, message: "School '" + row.name + "' removed successfully." };
    }
  }
  return { success: false, error: "School not found" };
}

function handleAdminCreateSchool(user, data) {
  enforceMinTier(user, 4, "handleAdminCreateSchool");
  // Delegate to onboardSchool with user context
  return handleOnboardSchool(data);
}

// ==========================================
// Raw Spreadsheet Access
// ==========================================

function getSheetDataRaw(user, data) {
  enforceMinTier(user, 4, "getSheetDataRaw");
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
      if (headers[j] === "password" || headers[j] === "session_token") {
        obj[headers[j]] = "••••••";
      } else {
        obj[headers[j]] = allRows[i][j];
      }
    }
    obj._rowIndex = i + 1;
    result.push(obj);
  }
  return { success: true, data: { headers, rows: result, totalRows: allRows.length - 1 } };
}

function updateSheetCell(user, data) {
  enforceMinTier(user, 4, "updateSheetCell");
  const { sheetName, rowIndex, columnName, value } = data;
  if (!sheetName || !rowIndex || !columnName) return { success: false, error: "Missing required fields" };

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

// ==========================================
// Member Override
// ==========================================

function overrideMember(user, data) {
  enforceMinTier(user, 4, "overrideMember");
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
      invalidateCache("members", CURRENT_SCHOOL_ID);
      return { success: true, message: row.name + "'s " + field + " updated to " + value };
    }
  }
  return { success: false, error: "Member not found" };
}

// ==========================================
// Feature Flags
// ==========================================

function saveFeatureFlags(user, data) {
  enforceMinTier(user, 4, "saveFeatureFlags");
  const { flags } = data;
  if (!flags) return { success: false, error: "Missing flags object" };

  let sheet = getSheet("system_config", CURRENT_SCHOOL_ID);
  if (!sheet) {
    const ss = getMasterDB();
    sheet = ss.insertSheet("system_config");
    sheet.appendRow(["key", "value", "updated_at", "updated_by"]);
  }
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][headers.indexOf("key")] === "feature_flags") {
      sheet.getRange(i + 1, headers.indexOf("value") + 1).setValue(JSON.stringify(flags));
      let updatedAtIdx = headers.indexOf("updated_at");
      let updatedByIdx = headers.indexOf("updated_by");
      if (updatedAtIdx !== -1) sheet.getRange(i + 1, updatedAtIdx + 1).setValue(new Date().toISOString());
      if (updatedByIdx !== -1) sheet.getRange(i + 1, updatedByIdx + 1).setValue(user.name);
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
  enforceMinTier(user, 4, "getFeatureFlags");
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
// Provisioning API (God Mode)
// ==========================================

function handleGodModeProvisionMember(user, data) {
  enforceMinTier(user, 4, "Provision Member");
  const { target_school_id, name, email, password, role, year_group_id } = data;
  if (!target_school_id || !email) return { success: false, error: "Missing required fields" };

  CURRENT_SCHOOL_ID = target_school_id;
  const sheet = getSheet("members", target_school_id);
  const headers = getHeaders(sheet);
  const newId = Utilities.getUuid();
  const username = (name || "user").toLowerCase().replace(/\s+/g, '.') + "." + newId.substring(0, 4);

  const newMember = {
    id: newId, name: name || "Provisioned User",
    username: username, email: email.toLowerCase(),
    password: hashPasswordLegacy(password || "TempPass123!"),
    role: role || "Member",
    year_group_id: year_group_id || "",
    school: target_school_id,
    date_joined: new Date().toISOString(),
    verification_status: "Approved", email_verified: "true",
    priv_email: "yeargroup", priv_phone: "hidden", priv_location: "all",
    priv_profession: "all", priv_linkedin: "all", priv_bio: "yeargroup", priv_social: "yeargroup"
  };

  sheet.appendRow(headers.map(h => newMember[h] !== undefined ? newMember[h] : ""));
  addToUsernameIndex(username, newId, target_school_id);
  invalidateCache("members", target_school_id);
  return { success: true, data: { id: newId, username } };
}

function handleGodModeProvisionYearGroup(user, data) {
  enforceMinTier(user, 4, "Provision Year Group");
  const { target_school_id, year, nickname } = data;
  if (!target_school_id || !year) return { success: false, error: "Missing required fields" };

  CURRENT_SCHOOL_ID = target_school_id;
  const sheet = getSheet("year_groups", target_school_id);
  const headers = getHeaders(sheet);
  const newId = "yg-" + year + "-" + Utilities.getUuid().substring(0, 4);

  sheet.appendRow(headers.map(h => {
    if (h === "id") return newId;
    if (h === "school") return target_school_id;
    if (h === "year") return year;
    if (h === "nickname") return nickname || "";
    return "";
  }));
  invalidateCache("year_groups", target_school_id);
  return { success: true, data: { id: newId } };
}

function handleGodModeProvisionClub(user, data) {
  enforceMinTier(user, 4, "Provision Club");
  const { target_school_id, group_name, group_type, description } = data;
  if (!target_school_id || !group_name) return { success: false, error: "Missing required fields" };
  // Clubs are stored in year_groups with a special type marker
  // This is a legacy structure - in future, clubs should get their own sheet
  return { success: true, message: "Club '" + group_name + "' registered (structural support pending Phase 2)" };
}

// ==========================================
// Debug / Seed Tools (PROTECTED — T4 only)
// ==========================================

function seedICUNIControl(user, data) {
  enforceMinTier(user, 4, "seedICUNIControl");
  // Only run if explicitly called by authenticated IT Department
  INITIALIZE_SHEETS(getMasterDB());
  return { success: true, message: "Schema initialized" };
}

function seedTestAccount(user, data) {
  enforceMinTier(user, 4, "seedTestAccount");
  const schoolId = resolveSchoolId(user, data);
  const sheet = getSheet("members", schoolId);
  const headers = getHeaders(sheet);
  const newId = "usr_tester_seed_" + new Date().getTime();
  const newMember = {
    id: newId, name: "Test Executive", username: "testexec",
    email: "testexec_" + new Date().getTime() + "@example.com",
    password: hashPasswordLegacy("testpassword"),
    role: "School Administrator",
    year_group_id: "ADMIN", year_group_nickname: "School Executives",
    school: data.targetSchool || user.school || "Auditor Academy",
    association: data.targetSchool || "Auditor Academy",
    date_joined: new Date().toISOString()
  };
  sheet.appendRow(headers.map(h => newMember[h] !== undefined ? newMember[h] : ""));
  invalidateCache("members", schoolId);
  return { success: true, data: { created: newId } };
}

function migrateImages(user, data) {
  enforceMinTier(user, 4, "migrateImages");
  let patched = 0;
  const sheetsToMigrate = ["members", "galleries", "schools", "posts", "albums"];
  sheetsToMigrate.forEach(sheetName => {
    const sheet = getSheet(sheetName);
    if (!sheet) return;
    const headers = getHeaders(sheet);
    const rows = sheet.getDataRange().getValues();
    const colsToCheck = ["profile_pic", "cover_url", "url", "logo_url", "brand_color", "avatar"];
    const colIndices = colsToCheck.map(c => headers.indexOf(c)).filter(i => i !== -1);

    for (let i = 1; i < rows.length; i++) {
      colIndices.forEach(colIndex => {
        let val = rows[i][colIndex];
        if (typeof val === 'string' && val.includes("drive.google.com/uc?export=view&id=")) {
          let newUrl = val.replace("https://drive.google.com/uc?export=view&id=", "https://lh3.googleusercontent.com/d/");
          sheet.getRange(i + 1, colIndex + 1).setValue(newUrl);
          patched++;
        }
      });
    }
  });
  return { success: true, patched: patched };
}

// ==========================================
// Log Management (Triggered separately)
// ==========================================

/**
 * Rotate logs — keep only last 500 entries.
 * Best practice: Set up as a time-driven trigger (daily), NOT in main codebase.
 * This function can be triggered from the GAS dashboard under Triggers.
 */
function rotateLogs() {
  try {
    const logSheet = getMasterDB().getSheetByName("logs");
    if (!logSheet) return;
    const lastRow = logSheet.getLastRow();
    if (lastRow > 500) {
      const rowsToDelete = lastRow - 500;
      logSheet.deleteRows(2, rowsToDelete);
    }
  } catch(e) {
    console.error("rotateLogs error:", e);
  }
}
