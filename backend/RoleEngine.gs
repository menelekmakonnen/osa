/**
 * OSA Platform — Role Engine & Governance
 * 
 * Corrected 5-Tier Governance Model:
 *   T4: Platform   (IT Department, ICUNI Staff)
 *   T3: School     (School Administrator, School President, School VP, etc.)
 *   T2: Year Group (YG President, YG VP, YG Gen. Secretary, etc.)
 *   T1: Club       (Honorary — Club President, etc. — NO elevated access)
 *   T0: Member / Visitor
 */

const ROLE_TIERS = {
  // Tier 4: Platform-wide authority
  "IT Department": 4,
  "ICUNI Staff": 4,
  "Platform Admin": 4,
  "Super Admin": 4,

  // Tier 3: School-wide authority
  "School Administrator": 3,
  "School President": 3,
  "School Vice President": 3,
  "School Gen. Secretary": 3,
  "School Organiser": 3,
  "School Finance Exec": 3,

  // Tier 2: Year Group authority
  "YG President": 2,
  "YG Vice President": 2,
  "YG Gen. Secretary": 2,
  "YG Organiser": 2,
  "YG Finance Exec": 2,

  // Tier 1: Club (honorary — same access as Member)
  "Club President": 1,
  "Club Vice President": 1,
  "Club Gen. Secretary": 1,
  "Club Organiser": 1,
  "Club Finance Exec": 1,
  "Club Admin": 1,

  // Tier 0: Base member / visitor
  "Member": 0,
  "Visitor": 0
};

/**
 * Get the tier number for a user.
 */
function getUserTier(user) {
  if (!user || !user.role) return 0;
  return ROLE_TIERS[user.role] !== undefined ? ROLE_TIERS[user.role] : 0;
}

/**
 * Check if a user has at least the required tier level.
 * Club tier (1) is honorary and does NOT grant elevated access.
 * For permission checks, Club users are treated as Tier 0.
 */
function hasMinTier(user, requiredTier) {
  const tier = getUserTier(user);
  // Club tier is honorary — treat as Member for permission purposes
  const effectiveTier = tier === 1 ? 0 : tier;
  return effectiveTier >= requiredTier;
}

/**
 * Check if user is at least a Year Group admin (T2+).
 * This is the most common permission check in the codebase.
 */
function isYGAdminOrAbove(user) {
  return hasMinTier(user, 2);
}

/**
 * Check if user is at least a School admin (T3+).
 */
function isSchoolAdminOrAbove(user) {
  return hasMinTier(user, 3);
}

/**
 * Check if user is Platform staff (T4).
 */
function isPlatformStaff(user) {
  return hasMinTier(user, 4);
}

/**
 * Enforce that the acting user has sufficient tier to perform an action.
 * Throws an error if unauthorized.
 * 
 * @param {Object} user - The acting user
 * @param {number} minTier - Minimum required tier (2=YG, 3=School, 4=Platform)
 * @param {string} [actionDesc] - Description for error message
 */
function enforceMinTier(user, minTier, actionDesc) {
  if (!hasMinTier(user, minTier)) {
    const tierNames = { 2: "Year Group Admin", 3: "School Administrator", 4: "Platform Staff" };
    throw new Error(
      "Forbidden: This action requires " + 
      (tierNames[minTier] || "Tier " + minTier) + 
      " or higher." +
      (actionDesc ? " (" + actionDesc + ")" : "")
    );
  }
  return true;
}

/**
 * Legacy enforceRoleHierarchy — maintained for backward compatibility.
 * New code should use enforceMinTier() instead.
 */
function enforceRoleHierarchy(user, targetRole, allowedTiers) {
  const actorTier = getUserTier(user);
  // Club tier is honorary
  const effectiveTier = actorTier === 1 ? 0 : actorTier;

  if (allowedTiers && !allowedTiers.includes(effectiveTier)) {
    throw new Error("Forbidden: Insufficient tier permissions for this action");
  }

  const targetTier = ROLE_TIERS[targetRole] || 0;
  if (effectiveTier <= targetTier) {
    throw new Error("Forbidden: A " + user.role + " cannot appoint or modify a " + targetRole + ".");
  }

  return true;
}

/**
 * Assign a role to a target member.
 * Validates that the assigner has appropriate authority.
 */
function assignTargetRole(user, data, schoolId) {
  const { target_user_id, new_role } = data;
  if (!target_user_id || !new_role) return { success: false, error: "Missing fields" };

  // Validate the assigner has the right to appoint this role
  try {
    enforceRoleHierarchy(user, new_role);
  } catch (err) {
    return { success: false, error: err.message };
  }

  const cached = getCachedSheetData("members", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;

  for (let i = 1; i < rows.length; i++) {
    let rowObj = rowToObject(rows[i], headers);
    if (rowObj.id === target_user_id) {
      // Scope validation: YG admins can only assign within their own year group
      if (getUserTier(user) === 2 && rowObj.year_group_id !== user.year_group_id) {
        return { success: false, error: "A YG Admin can only assign roles within their own year group." };
      }
      // School admins can only assign within their own school
      if (getUserTier(user) === 3 && rowObj.school !== user.school) {
        return { success: false, error: "A School Admin can only assign roles within their own school." };
      }

      sheet.getRange(i + 1, headers.indexOf("role") + 1).setValue(new_role);
      invalidateCache("members", schoolId);
      return { success: true, message: "Role successfully updated to " + new_role };
    }
  }

  return { success: false, error: "Target member not found" };
}
