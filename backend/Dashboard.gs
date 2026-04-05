/**
 * OSA Platform — Dashboard & Profile
 * Contains: getDashboard, getProfile, updateProfile, getSchools
 */

function getDashboard(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const activeScope = data || {};
  const scope_type = activeScope.scope_type || activeScope.type || 'yeargroup';
  const scope_id = activeScope.scope_id || activeScope.id || user.year_group_id;
  const userSchool = user.school || "UNKNOWN_SCHOOL";

  let ygMembersCount = 0;
  let activeCampaignsCount = 0;
  let upcomingEventsCount = 0;
  let pendingPostsCount = 0;
  let recentPosts = [];
  let upcomingEvents = [];

  try {
    const allMembers = getSheetData("members", schoolId);
    const allPosts = getSheetData("posts", schoolId);
    const allCampaigns = getSheetData("campaigns", schoolId);
    const allEvents = getSheetData("events", schoolId);

    const schoolMembers = allMembers.filter(m => (m.school || "") === userSchool);

    if (scope_type === 'yeargroup') {
      ygMembersCount = schoolMembers.filter(m => m.year_group_id === scope_id).length;
    } else if (scope_type === 'school') {
      ygMembersCount = schoolMembers.length;
    }

    activeCampaignsCount = allCampaigns.filter(c => {
      if ((c.school || "") !== userSchool) return false;
      return c.status === "Active" || c.status === "Approved";
    }).length;

    const now = new Date();
    upcomingEventsCount = allEvents.filter(ev => {
      if ((ev.school || "") !== userSchool) return false;
      return new Date(ev.date) >= now;
    }).length;

    const isAdmin = isYGAdminOrAbove(user);
    if (isAdmin) {
      pendingPostsCount = allPosts.filter(p => {
        if ((p.school || "") !== userSchool) return false;
        return p.status === "Pending";
      }).length;
    }

    recentPosts = allPosts.filter(p => {
      if ((p.school || "") !== userSchool) return false;
      if (p.status !== "Approved") return false;
      if (scope_type === 'yeargroup' && p.scope_id !== scope_id && p.scope_type !== 'school') return false;
      return true;
    }).sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date)).slice(0, 5);

    upcomingEvents = allEvents.filter(ev => {
      if ((ev.school || "") !== userSchool) return false;
      return new Date(ev.date) >= now;
    }).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);

  } catch(e) {
    console.error("getDashboard error:", e);
  }

  return {
    success: true,
    stats: { ygMembersCount, activeCampaignsCount, upcomingEventsCount, pendingPostsCount },
    recentPosts,
    upcomingEvents
  };
}

function getProfile(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const targetId = (data && data.userId) || user.id;
  const allMembers = getSheetData("members", schoolId);
  let member = allMembers.find(m => m.id === targetId);

  if (!member) {
    // Check staff if not found in school DB
    const staffData = getSheetData("members", "ICUNI_LABS");
    member = staffData.find(m => m.id === targetId);
  }

  if (!member) return { success: false, error: "Member not found" };

  // Apply privacy filters if viewing someone else
  if (targetId !== user.id) {
    member = applyPrivacyFilters(member, user);
  }

  delete member.password;
  delete member.session_token;
  delete member.token_expiry;
  return { success: true, data: member };
}

function updateProfile(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const cached = getCachedSheetData("members", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;

  const allowedFields = ["bio", "profession", "location", "phone", "linkedin", "social_links", "cover_url",
    "priv_email", "priv_phone", "priv_location", "priv_profession", "priv_linkedin", "priv_bio", "priv_social"];

  for (let i = 1; i < rows.length; i++) {
    let rowObj = rowToObject(rows[i], headers);
    if (rowObj.id === user.id) {
      allowedFields.forEach(field => {
        if (data[field] !== undefined) {
          let colIdx = headers.indexOf(field);
          if (colIdx !== -1) {
            sheet.getRange(i + 1, colIdx + 1).setValue(sanitizeInput(data[field]));
          }
        }
      });
      // Handle profile picture separately
      if (data.profile_pic !== undefined) {
        let picIdx = headers.indexOf("profile_pic");
        if (picIdx !== -1) sheet.getRange(i + 1, picIdx + 1).setValue(data.profile_pic);
      }
      invalidateCache("members", schoolId);
      return { success: true, message: "Profile updated" };
    }
  }
  return { success: false, error: "User not found" };
}

function getSchools(user, data) {
  const schools = getSheetData("schools", "ICUNI_LABS");
  return { success: true, data: schools };
}

function getYearGroups(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const ygs = getSheetData("year_groups", schoolId);
  return { success: true, data: ygs };
}

function getGroupSettings(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id || user.school;
  if (!scope_type || !scope_id) return { success: true, data: {} };

  const rows = getSheetData("group_settings", schoolId);
  const targetSchool = user.school || "UNKNOWN_SCHOOL";

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
  const schoolId = resolveSchoolId(user, data);
  const { scope_type, scope_id, settings } = data;
  if (!scope_type || !scope_id) return { success: false, error: "Missing scope" };

  // Require at least YG admin
  if (!isYGAdminOrAbove(user)) {
    return { success: false, error: "Unauthorized. Must be an admin/exec." };
  }

  const cached = getCachedSheetData("group_settings", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;
  const targetSchool = user.school || "UNKNOWN_SCHOOL";

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
    sheet.getRange(foundIndex + 1, headers.indexOf("settings_json") + 1).setValue(newJson);
    sheet.getRange(foundIndex + 1, headers.indexOf("updated_at") + 1).setValue(nowStamp);
  } else {
    let newId = Utilities.getUuid();
    let newRow = { id: newId, scope_type, scope_id, school: targetSchool, settings_json: newJson, updated_at: nowStamp };
    sheet.appendRow(headers.map(h => newRow[h] || ""));
  }
  invalidateCache("group_settings", schoolId);
  return { success: true, message: "Settings saved successfully" };
}
