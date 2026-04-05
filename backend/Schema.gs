/**
 * OSA Platform — Schema Initialization & Migrations
 * Contains: INITIALIZE_SHEETS, schema definitions, username_index
 */

/**
 * Initialize or migrate sheets for a given spreadsheet (Master or School DB).
 */
function INITIALIZE_SHEETS(targetDB) {
  const ss = targetDB || getDB(null);
  const isMaster = ss.getId() === MASTER_DB_ID;

  const allSheets = {
    "staff": ["id", "name", "username", "email", "password", "role", "year_group_id", "year_group_nickname", "final_class", "house_name", "gender", "cheque_colour", "school", "association", "date_joined", "session_token", "token_expiry", "priv_email", "priv_phone", "priv_location", "priv_profession", "priv_linkedin", "priv_bio", "priv_social", "bio", "profession", "location", "phone", "linkedin", "social_links", "profile_pic", "cover_url", "school_admin_id", "verification_status", "drive_folder_id", "email_verified", "id_verified"],
    "schools": ["id", "name", "association_name", "association_short_name", "motto", "colours", "cheque_representation", "type", "classes", "houses", "status", "admin_id", "avatar", "spreadsheet_id", "drive_folder_id"],
    "username_index": ["username", "member_id", "school_id", "created_at"],
    "year_groups": ["id", "school", "year", "nickname", "house_name", "cheque_colour", "avatar", "drive_folder_id"],
    "members": ["id", "name", "username", "email", "password", "role", "year_group_id", "year_group_nickname", "final_class", "house_name", "gender", "cheque_colour", "school", "association", "date_joined", "session_token", "token_expiry", "priv_email", "priv_phone", "priv_location", "priv_profession", "priv_linkedin", "priv_bio", "priv_social", "bio", "profession", "location", "phone", "linkedin", "social_links", "profile_pic", "cover_url", "school_admin_id", "verification_status", "drive_folder_id", "email_verified", "id_verified"],
    "posts": ["id", "title", "category", "content", "author_id", "author_name", "scope_type", "scope_id", "school", "submission_date", "status", "newsletter_month", "rejection_note"],
    "campaigns": ["id", "title", "type", "description", "target_amount", "currency", "deadline", "scope", "scope_type", "scope_id", "school", "status", "raised_amount", "donor_count", "updates", "created_by"],
    "donations": ["id", "campaign_id", "donor_id", "amount", "timestamp", "payment_method", "is_anonymous", "status", "approved_by"],
    "events": ["id", "title", "type", "description", "date", "time", "virtual_link", "venue", "scope", "scope_type", "scope_id", "school", "max_attendees", "status", "created_by"],
    "rsvps": ["id", "event_id", "user_id", "timestamp"],
    "newsletters": ["id", "month", "scope_type", "scope_id", "post_ids", "recipient_count", "dispatched_by", "timestamp"],
    "board_messages": ["id", "scope_type", "scope_id", "school", "author_id", "author_name", "content", "comments", "reactions", "timestamp"],
    "albums": ["id", "scope_type", "scope_id", "school", "name", "description", "created_by_id", "created_by_name", "timestamp"],
    "galleries": ["id", "scope_type", "scope_id", "school", "album_id", "uploaded_by_id", "uploaded_by_name", "url", "timestamp"],
    "tickets": ["id", "author_id", "author_name", "school", "issue_type", "description", "status", "current_tier", "created_at", "last_escalated_at", "resolution"],
    "petitions": ["id", "target_sa_id", "target_sa_name", "scope_type", "scope_id", "school", "reason", "signatures", "status", "created_at"],
    "group_settings": ["id", "scope_type", "scope_id", "school", "settings_json", "updated_at"],
    "system_config": ["key", "value", "updated_at", "updated_by"],
    "logs": ["timestamp", "action", "user", "details"],
    "privileges": ["id", "account_type", "permissions_json", "description"],
    "tiers": ["id", "tier_name", "features_json"]
  };

  let sheetsToCreate = {};
  if (isMaster) {
    const masterKeys = ["staff", "schools", "username_index", "tickets", "events", "newsletters", "privileges", "tiers", "system_config", "logs"];
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

      // Seed initial data for specific sheets
      if (s === "year_groups") {
        sheet.appendRow(["yg-2012", "Aggrey Memorial", "2012", "The Pioneers", "Aggrey House", "#22c55e"]);
      }
      if (s === "privileges") {
        sheet.appendRow(["priv_sys", "IT Department", JSON.stringify({ "all": true }), "Unrestricted Global Platform Access"]);
        sheet.appendRow(["priv_staff", "ICUNI Staff", JSON.stringify({ "view_all_schools": true, "manage_tickets": true }), "Global Read-Only + Support Access"]);
        sheet.appendRow(["priv_sch_admin", "School Administrator", JSON.stringify({ "manage_school": true }), "Full control over a specific school"]);
      }
      if (s === "tiers") {
        sheet.appendRow(["tier_0", "Member / Visitor", JSON.stringify({ "base_features": true })]);
        sheet.appendRow(["tier_1", "Club (Honorary)", JSON.stringify({ "base_features": true })]);
        sheet.appendRow(["tier_2", "Year Group Execs", JSON.stringify({ "manage_group": true })]);
        sheet.appendRow(["tier_3", "School Execs/Admins", JSON.stringify({ "manage_school": true })]);
        sheet.appendRow(["tier_4", "Platform Staff", JSON.stringify({ "manage_system": true })]);
      }
      if (s === "system_config") {
        sheet.appendRow(["feature_flags", JSON.stringify({ "maintenance_mode": false, "registration_open": true }), new Date().toISOString(), "system"]);
      }
    } else {
      // Schema Migration: add missing headers
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

/**
 * Rebuild the global username index from all schools.
 * Run once manually after enabling the index.
 */
function rebuildUsernameIndex() {
  const masterSS = getMasterDB();
  let indexSheet = masterSS.getSheetByName("username_index");
  if (!indexSheet) {
    INITIALIZE_SHEETS(masterSS);
    indexSheet = masterSS.getSheetByName("username_index");
  }
  
  // Clear existing data (keep headers)
  if (indexSheet.getLastRow() > 1) {
    indexSheet.getRange(2, 1, indexSheet.getLastRow() - 1, indexSheet.getLastColumn()).clearContent();
  }
  
  const now = new Date().toISOString();
  const entries = [];
  
  // Staff
  const staffSheet = masterSS.getSheetByName("staff");
  if (staffSheet) {
    const sh = getHeaders(staffSheet);
    const sr = staffSheet.getDataRange().getValues();
    for (let i = 1; i < sr.length; i++) {
      let row = rowToObject(sr[i], sh);
      if (row.username) entries.push([String(row.username).toLowerCase(), row.id, "MASTER", now]);
    }
  }
  
  // All schools
  const schoolsSheet = masterSS.getSheetByName("schools");
  if (schoolsSheet) {
    const sch = getHeaders(schoolsSheet);
    const scr = schoolsSheet.getDataRange().getValues();
    for (let j = 1; j < scr.length; j++) {
      let sRow = rowToObject(scr[j], sch);
      if (!sRow.spreadsheet_id) continue;
      try {
        const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
        const mSheet = schoolSS.getSheetByName("members");
        if (!mSheet) continue;
        const mh = getHeaders(mSheet);
        const mr = mSheet.getDataRange().getValues();
        for (let k = 1; k < mr.length; k++) {
          let mRow = rowToObject(mr[k], mh);
          if (mRow.username) entries.push([String(mRow.username).toLowerCase(), mRow.id, sRow.id, now]);
        }
      } catch(e) { console.error("Failed to index school " + sRow.id, e); }
    }
  }
  
  // Batch write
  if (entries.length > 0) {
    indexSheet.getRange(2, 1, entries.length, 4).setValues(entries);
  }
  
  return { success: true, message: "Indexed " + entries.length + " usernames" };
}
