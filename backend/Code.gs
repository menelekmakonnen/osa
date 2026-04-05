/**
 * OSA Platform — Main Router
 * 
 * This file ONLY handles HTTP routing. All business logic lives in 
 * domain-specific files (Auth.gs, Dashboard.gs, Newsletter.gs, etc.)
 * 
 * Architecture:
 *   Code.gs       → HTTP routing + action dispatch
 *   Utils.gs      → Constants, helpers, hashPassword
 *   DataAccess.gs → DB access, caching, tenant resolution
 *   Schema.gs     → Sheet initialization & migrations
 *   RoleEngine.gs → 5-tier governance, permission checks
 *   Auth.gs       → Login, register, sessions, passwords, magic links
 *   Dashboard.gs  → Dashboard, profile, settings
 *   Directory.gs  → Member directory, privacy engine
 *   Newsletter.gs → Posts, newsletter dispatch
 *   Fundraising.gs → Campaigns, donations, pledges
 *   Events.gs     → Events, RSVPs
 *   Board.gs      → Group board, comments, reactions
 *   Gallery.gs    → Image uploads, albums, lazy Drive folders
 *   Support.gs    → Tech support tickets
 *   Cockpit.gs    → Admin panel, staff mgmt, raw DB access
 */

// ==========================================
// HTTP Entry Points
// ==========================================

function doGet(e) {
  const params = e.parameter;
  if (params.action === "ping") {
    return jsonResponse({ success: true, message: "OSA API Online", version: "2.0.0", timestamp: new Date().toISOString() });
  }
  if (params.action === "verifyEmail") {
    return jsonResponse(handleVerifyEmail({ token: params.token }));
  }
  if (params.action === "completeMagicLogin") {
    return jsonResponse(handleCompleteMagicLinkLogin({ token: params.token }));
  }
  return jsonResponse({ success: true, message: "OSA Platform API v2.0" });
}

function doPost(e) {
  try {
    let data = {};
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    const action = data.action || (e.parameter && e.parameter.action) || "";
    const token = data.token || "";
    const result = handleAction(action, data, token);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: "Server error: " + err.toString() });
  }
}

function doOptions(e) {
  let output = ContentService.createTextOutput("");
  output.setMimeType(ContentService.MimeType.TEXT);
  return output;
}

// ==========================================
// Action Routing (Declarative)
// ==========================================

/**
 * Public actions: no authentication required.
 */
const PUBLIC_ACTIONS = {
  login:                handleLogin,
  register:             handleRegister,
  registerStaff:        handleRegisterStaff,
  onboardSchool:        handleOnboardSchool,
  resetPassword:        handleResetPassword,
  completePasswordReset: handleCompletePasswordReset,
  requestMagicLink:     handleRequestMagicLink,
  completeMagicLogin:   handleCompleteMagicLinkLogin,
  verifyEmail:          handleVerifyEmail,
  resendVerification:   handleResendVerification,
  checkUsername:        handleCheckUsername,
  getSchools:           function(data) { return { success: true, data: getSheetData("schools", "ICUNI_LABS") }; },
  getYearGroups:        function(data) {
    const schoolId = data.school_id || CURRENT_SCHOOL_ID;
    CURRENT_SCHOOL_ID = schoolId;
    return { success: true, data: getSheetData("year_groups", schoolId) };
  }
};

/**
 * Protected actions: require valid session token.
 * Each entry maps an action name to its handler function.
 * All handlers receive (user, data) where user is the validated session.
 */
const PROTECTED_ACTIONS = {
  // Dashboard & Profile
  getDashboard:         getDashboard,
  getProfile:           getProfile,
  updateProfile:        updateProfile,
  changePassword:       function(user, data) { return changePassword(user, data, CURRENT_SCHOOL_ID); },
  getGroupSettings:     getGroupSettings,
  saveGroupSettings:    saveGroupSettings,

  // Directory
  getMembers:           getMembers,

  // Newsletter
  getPosts:             getPosts,
  submitPost:           submitPost,
  updatePostStatus:     updatePostStatus,
  dispatchNewsletter:   dispatchNewsletter,

  // Fundraising
  getCampaigns:         getCampaigns,
  createCampaign:       createCampaign,
  submitDonation:       handleDonation,
  approveDonation:      handleApproveDonation,
  adminAssignDonation:  handleAdminAssignDonation,
  getPendingPledges:    getPendingPledges,

  // Events
  getEvents:            getEvents,
  createEvent:          createEvent,
  rsvpToEvent:          rsvpToEvent,

  // Board
  getBoardMessages:     getBoardMessages,
  postBoardMessage:     postBoardMessage,
  addBoardComment:      addBoardComment,
  reactBoardMessage:    reactBoardMessage,

  // Gallery
  uploadImage:          uploadImage,
  getAlbums:            getAlbums,
  createAlbum:          createAlbum,
  getGalleryItems:      getGalleryItems,
  updateGroupAvatar:    updateGroupAvatar,

  // Support
  getTickets:           getTickets,
  submitTicket:         submitTicket,
  escalateTicket:       escalateTicket,
  resolveTicket:        resolveTicket,

  // Role Management
  assignTargetRole:     function(user, data) { return assignTargetRole(user, data, CURRENT_SCHOOL_ID); },

  // Cockpit (T4 — enforced inside each function)
  getSystemOverview:    getSystemOverview,
  getStaffRoster:       getStaffRoster,
  addStaffMember:       addStaffMember,
  removeStaffMember:    removeStaffMember,
  removeSchool:         removeSchool,
  getSheetDataRaw:      getSheetDataRaw,
  updateSheetCell:      updateSheetCell,
  overrideMember:       overrideMember,
  saveFeatureFlags:     saveFeatureFlags,
  getFeatureFlags:      getFeatureFlags,
  seedTestAccount:      seedTestAccount,
  migrateImages:        migrateImages,
  adminCreateSchool:    handleAdminCreateSchool,

  // Provisioning (T4 — enforced inside each function)
  adminProvisionMember:    handleGodModeProvisionMember,
  adminProvisionYearGroup: handleGodModeProvisionYearGroup,
  adminProvisionClub:      handleGodModeProvisionClub,

  // Protected admin tools (previously public — SECURITY FIX)
  sync_schema:          function(user, data) { enforceMinTier(user, 4, "sync_schema"); INITIALIZE_SHEETS(); return { success: true, message: "Schema synchronized" }; },
  seedICUNIControl:     seedICUNIControl,
  rebuildUsernameIndex: function(user, data) { enforceMinTier(user, 4, "rebuildUsernameIndex"); return rebuildUsernameIndex(); },
  getSchoolsList:       getSchools,
  getYearGroupsList:    getYearGroups
};

/**
 * Main action router.
 * Replaces the 270-line if/else chain with declarative lookup.
 */
function handleAction(action, data, token) {
  if (!action) return { success: false, error: "No action specified" };

  // 1. Public actions (no auth required)
  if (PUBLIC_ACTIONS[action]) {
    try {
      return PUBLIC_ACTIONS[action](data);
    } catch(err) {
      return { success: false, error: err.message || err.toString() };
    }
  }

  // 2. Authentication check
  const user = validateToken(token);
  if (!user) {
    return { success: false, error: "Invalid or expired session. Please log in again.", code: 401 };
  }

  // 3. Resolve tenant context
  CURRENT_SCHOOL_ID = resolveSchoolId(user, data);

  // 4. Check impersonation context
  if (data && data._impersonation_school_id && isPlatformStaff(user)) {
    CURRENT_SCHOOL_ID = data._impersonation_school_id;
  }

  // 5. Dispatch protected action
  if (PROTECTED_ACTIONS[action]) {
    try {
      return PROTECTED_ACTIONS[action](user, data);
    } catch(err) {
      // Distinguish authorization errors from other errors
      if (err.message && err.message.startsWith("Forbidden:")) {
        return { success: false, error: err.message, code: 403 };
      }
      return { success: false, error: err.message || err.toString() };
    }
  }

  return { success: false, error: "Unknown action: " + action };
}
