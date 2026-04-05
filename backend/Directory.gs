/**
 * OSA Platform — Members Directory & Privacy Engine
 * Contains: getMembers, applyPrivacyFilters, checkSupergroup
 */

function getMembers(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;
  const userSchool = user.school || "UNKNOWN_SCHOOL";

  const allMembers = getSheetData("members", schoolId);
  const userTier = getUserTier(user);
  const effectiveTier = userTier === 1 ? 0 : userTier; // Club is honorary

  let filtered = allMembers.filter(m => {
    if ((m.school || "") !== userSchool) return false;
    if (scope_type === 'yeargroup' && m.year_group_id !== scope_id) return false;
    if (scope_type === 'house' && m.house_name !== scope_id) return false;
    return true;
  });

  // Apply privacy filters for non-admin viewers
  filtered = filtered.map(m => {
    delete m.password;
    delete m.session_token;
    delete m.token_expiry;
    if (m.id === user.id) return m; // Full access to own profile
    return applyPrivacyFilters(m, user);
  });

  return { success: true, data: filtered };
}

/**
 * Privacy filter engine.
 * 
 * Fields are controlled by privacy settings (hidden, yeargroup, school, all):
 *   - priv_email, priv_phone, priv_location, priv_profession, priv_linkedin, priv_bio, priv_social
 * 
 * Access hierarchy:
 *   - Own profile: full access (handled before calling this)
 *   - Tier 2+ (YG Admin and above): full access to members in their scope
 *   - Same year group: see fields set to "yeargroup" or "all"
 *   - Same school: see fields set to "school" or "all"
 *   - Everyone: see fields set to "all"
 *   - "hidden": never visible to others
 */
function applyPrivacyFilters(targetMember, viewerUser) {
  const viewerTier = getUserTier(viewerUser);
  const effectiveTier = viewerTier === 1 ? 0 : viewerTier; // Club is honorary

  // Tier 2+ (YG Admin and above) get full access to members in their scope
  if (effectiveTier >= 2) {
    return targetMember;
  }

  // Determine relationship
  const sameYG = targetMember.year_group_id === viewerUser.year_group_id;
  const sameSchool = targetMember.school === viewerUser.school;

  // Also check supergroup (same 5-year window)
  const sameSuper = sameYG || checkSupergroup(viewerUser.year_group_id, targetMember.year_group_id);

  const privacyFields = {
    email: "priv_email",
    phone: "priv_phone",
    location: "priv_location",
    profession: "priv_profession",
    linkedin: "priv_linkedin",
    bio: "priv_bio",
    social_links: "priv_social"
  };

  for (let field in privacyFields) {
    const privSetting = targetMember[privacyFields[field]] || "yeargroup";

    let canSee = false;
    if (privSetting === "all") canSee = true;
    else if (privSetting === "school" && sameSchool) canSee = true;
    else if (privSetting === "yeargroup" && (sameYG || sameSuper)) canSee = true;

    if (!canSee) {
      delete targetMember[field];
    }
  }

  return targetMember;
}

/**
 * Check if two year group IDs fall within the same "supergroup" (5-year window).
 * Year group IDs typically contain the graduation year, e.g., "yg-2012", "yg-2014".
 */
function checkSupergroup(viewerYgId, targetYgId) {
  if (!viewerYgId || !targetYgId) return false;
  const viewerMatch = String(viewerYgId).match(/\d{4}/);
  const targetMatch = String(targetYgId).match(/\d{4}/);
  if (!viewerMatch || !targetMatch) return false;
  return Math.abs(parseInt(viewerMatch[0]) - parseInt(targetMatch[0])) <= 5;
}
