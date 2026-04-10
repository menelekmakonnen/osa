/**
 * OSA API Client v3.0 — With Smart Caching
 * Interfaces with the Google Apps Script Backend
 *
 * Changes from v2:
 *   - Two-tier caching (in-memory + deduplication)
 *   - TTL-based cache per action type
 *   - Scope-aware cache keys
 *   - Automatic cache invalidation on mutations
 *   - Force-refresh and clear-all methods
 */

const GAS_URL = import.meta.env.VITE_GAS_URL || "https://script.google.com/macros/s/AKfycby88ZH_HMNAczLJwROj83yQ2jcEL7MURR9hlrKkTXc2KHRQpQnppZyY2Amq_IHKGAHp/exec";

// Initialize from localStorage if available
let sessionToken = window.localStorage.getItem('osa_session_token') || null;
let currentUser = window.localStorage.getItem('osa_current_user')
  ? JSON.parse(window.localStorage.getItem('osa_current_user'))
  : null;

let localActionedPosts = {};

// ==========================================
// Request Deduplication
// ==========================================

const _inFlightRequests = new Map();

function getDedupeKey(action, data) {
  const safeActions = ['getDashboard', 'getProfile', 'getMembers', 'getPosts', 'getCampaigns', 'getEvents', 'getBoardMessages', 'getAlbums', 'getGalleryItems', 'getTickets', 'getSystemOverview', 'getStaffRoster', 'getSheetDataRaw', 'getFeatureFlags', 'getGroupSettings', 'getSchools', 'getYearGroupsList', 'getPendingPledges'];
  if (!safeActions.includes(action)) return null;
  return action + '::' + JSON.stringify(data || {});
}

// ==========================================
// Smart Cache Layer
// ==========================================

const _cache = new Map();

/** TTL (in ms) per action. Actions not listed are not cached. */
const CACHE_TTL = {
  getDashboard:       5 * 60 * 1000,   // 5 min
  getGroupSettings:   5 * 60 * 1000,
  getMembers:         10 * 60 * 1000,  // 10 min
  getPosts:           3 * 60 * 1000,   // 3 min
  getBoardMessages:   3 * 60 * 1000,
  getCampaigns:       5 * 60 * 1000,
  getEvents:          5 * 60 * 1000,
  getAlbums:          10 * 60 * 1000,
  getGalleryItems:    10 * 60 * 1000,
  getTickets:         2 * 60 * 1000,   // 2 min
  getSystemOverview:  3 * 60 * 1000,
  getStaffRoster:     3 * 60 * 1000,
  getFeatureFlags:    10 * 60 * 1000,
  getSchools:         30 * 60 * 1000,  // 30 min (almost static)
  getYearGroupsList:  30 * 60 * 1000,
  getProfile:         5 * 60 * 1000,
  getPendingPledges:  2 * 60 * 1000,
  getSheetDataRaw:    2 * 60 * 1000,
};

/** Maps mutation actions to the GET actions they should invalidate */
const MUTATION_INVALIDATES = {
  submitPost:           ['getPosts', 'getDashboard'],
  updatePostStatus:     ['getPosts', 'getDashboard'],
  dispatchNewsletter:   ['getPosts', 'getDashboard'],
  submitDonation:       ['getCampaigns', 'getDashboard', 'getPendingPledges'],
  createCampaign:       ['getCampaigns', 'getDashboard'],
  approveDonation:      ['getCampaigns', 'getDashboard', 'getPendingPledges'],
  adminAssignDonation:  ['getCampaigns', 'getDashboard', 'getPendingPledges'],
  createEvent:          ['getEvents', 'getDashboard'],
  rsvpToEvent:          ['getEvents'],
  postBoardMessage:     ['getBoardMessages'],
  addBoardComment:      ['getBoardMessages'],
  reactBoardMessage:    ['getBoardMessages'],
  createAlbum:          ['getAlbums'],
  uploadImage:          ['getGalleryItems', 'getAlbums'],
  updateGroupAvatar:    ['getGroupSettings', 'getDashboard'],
  updateProfile:        ['getProfile', 'getDashboard', 'getMembers'],
  changePassword:       ['getProfile'],
  saveGroupSettings:    ['getGroupSettings', 'getDashboard'],
  submitTicket:         ['getTickets'],
  escalateTicket:       ['getTickets'],
  resolveTicket:        ['getTickets'],
  assignTargetRole:     ['getMembers', 'getDashboard'],
  addStaffMember:       ['getStaffRoster', 'getSystemOverview'],
  removeStaffMember:    ['getStaffRoster', 'getSystemOverview'],
  removeSchool:         ['getSchools', 'getSystemOverview'],
  onboardSchool:        ['getSchools'],
  adminCreateSchool:    ['getSchools', 'getSystemOverview'],
  saveFeatureFlags:     ['getFeatureFlags'],
  overrideMember:       ['getMembers', 'getSheetDataRaw'],
  updateSheetCell:      ['getSheetDataRaw'],
  adminProvisionMember:    ['getMembers', 'getSystemOverview'],
  adminProvisionYearGroup: ['getYearGroupsList', 'getSystemOverview'],
  adminProvisionClub:      ['getSystemOverview'],
};

function getCacheKey(action, data) {
  return action + '::' + JSON.stringify(data || {});
}

function getCachedResult(action, data) {
  if (!CACHE_TTL[action]) return null;

  const key = getCacheKey(action, data);
  const entry = _cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL[action]) {
    _cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCacheResult(action, data, result) {
  if (!CACHE_TTL[action]) return;
  const key = getCacheKey(action, data);
  _cache.set(key, { data: result, timestamp: Date.now() });
}

function invalidateRelated(mutationAction) {
  const targets = MUTATION_INVALIDATES[mutationAction];
  if (!targets) return;

  for (const [key] of _cache) {
    const actionPart = key.split('::')[0];
    if (targets.includes(actionPart)) {
      _cache.delete(key);
    }
  }
}

/** Force-refresh a specific action (clears its cache entries) */
function refreshCache(action) {
  for (const [key] of _cache) {
    if (key.startsWith(action + '::')) {
      _cache.delete(key);
    }
  }
}

/** Clear all caches */
function clearAllCaches() {
  _cache.clear();
}

// ==========================================
// Auth State
// ==========================================

export const authState = {
  getToken: () => sessionToken,
  getUser: () => currentUser,
  setSession: (token, user) => {
    sessionToken = token;
    currentUser = user;
    window.localStorage.setItem('osa_session_token', token);
    window.localStorage.setItem('osa_current_user', JSON.stringify(user));
  },
  clearSession: () => {
    sessionToken = null;
    currentUser = null;
    window.localStorage.removeItem('osa_session_token');
    window.localStorage.removeItem('osa_current_user');
    window.localStorage.removeItem('osa_active_impersonation');
    clearAllCaches(); // Clear caches on logout
  },
  isAuthenticated: () => !!sessionToken,

  /**
   * Check if the stored token has expired client-side.
   * Returns true if token appears valid, false if expired.
   */
  isTokenValid: () => {
    if (!sessionToken || !currentUser) return false;
    if (currentUser.token_expiry) {
      const expiry = new Date(currentUser.token_expiry);
      if (expiry < new Date()) {
        authState.clearSession();
        return false;
      }
    }
    return true;
  }
};

// ==========================================
// Core API Request Wrapper
// ==========================================

export async function apiRequest(action, data = {}) {
  // Demo mode: intercept all requests and return fake data
  if (window.localStorage.getItem('osa_demo_mode') === 'true') {
    const { demoApiRequest } = await import('./demoData');
    return demoApiRequest(action, data);
  }

  // Check token validity client-side before making request
  if (sessionToken && !authState.isTokenValid()) {
    window.dispatchEvent(new Event("osa-auth-expired"));
    return null;
  }

  // Check cache first for GET-like actions
  const cached = getCachedResult(action, data);
  if (cached !== null) {
    return cached;
  }

  // Request deduplication for GET-like actions
  const dedupeKey = getDedupeKey(action, data);
  if (dedupeKey && _inFlightRequests.has(dedupeKey)) {
    return _inFlightRequests.get(dedupeKey);
  }

  const requestPromise = _executeRequest(action, data);

  if (dedupeKey) {
    _inFlightRequests.set(dedupeKey, requestPromise);
    requestPromise.finally(() => {
      _inFlightRequests.delete(dedupeKey);
    });
  }

  return requestPromise;
}

async function _executeRequest(action, data) {
  try {
    let finalData = { ...data };

    // Inject ICUNI Impersonation Context if active
    const impersonationStr = window.localStorage.getItem('osa_active_impersonation');
    if (impersonationStr) {
      try {
        const impData = JSON.parse(impersonationStr);
        if (impData.target_school_id) {
          finalData.target_school_id = impData.target_school_id;
          finalData._impersonation_school_id = impData.target_school_id;
        }
        if (impData.simulate_role) finalData.simulate_role = impData.simulate_role;
      } catch(e) {}
    }

    const payload = {
      action,
      data: finalData,
      token: sessionToken
    };

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();

    if (result.code === 401) {
      authState.clearSession();
      window.dispatchEvent(new Event("osa-auth-expired"));
      return null;
    }

    if (!result.success) {
      throw new Error(result.error || "Unknown API Error");
    }

    // Cache successful GET results
    setCacheResult(action, data, result.data);

    // Invalidate related caches on mutations
    invalidateRelated(action);

    return result.data;

  } catch (error) {
    if (error.message.includes("401")) {
      authState.clearSession();
      window.dispatchEvent(new Event("osa-auth-expired"));
      return null;
    }
    console.warn(`[API Error] ${action}: `, error);
    throw error;
  }
}

// ==========================================
// API Methods
// ==========================================

export const api = {
  // Cache control
  refreshCache,
  clearAllCaches,

  // Impersonation Control
  setImpersonation: (schoolId, role) => {
    window.localStorage.setItem('osa_active_impersonation', JSON.stringify({ target_school_id: schoolId, simulate_role: role }));
    window.dispatchEvent(new CustomEvent("osa-impersonation-changed", { detail: { schoolId, role } }));
    clearAllCaches(); // Clear all caches on impersonation change
    window.location.href = '/app/dashboard';
  },
  clearImpersonation: () => {
    window.localStorage.removeItem('osa_active_impersonation');
    window.dispatchEvent(new CustomEvent("osa-impersonation-changed", { detail: null }));
    clearAllCaches();
    window.location.href = '/app/dashboard';
  },
  getImpersonation: () => {
    try {
      return JSON.parse(window.localStorage.getItem('osa_active_impersonation'));
    } catch(e) { return null; }
  },

  // Auth
  login: async (email, password) => {
    const data = await apiRequest("login", { email, password });
    authState.setSession(data.token, data.user);
    return data;
  },
  register: async (registrationData) => {
    const data = await apiRequest("register", registrationData);
    authState.setSession(data.token, data.user);
    return data;
  },
  registerStaff: async (registrationData) => {
    const data = await apiRequest("registerStaff", registrationData);
    authState.setSession(data.token, data.user);
    return data;
  },
  logout: () => {
    authState.clearSession();
    window.dispatchEvent(new Event("osa-auth-expired"));
  },

  // Password Management
  requestPasswordReset: (email) => apiRequest("resetPassword", { email }),
  completePasswordReset: (token, new_password) => apiRequest("completePasswordReset", { token, new_password }),
  changePassword: (passwordData) => apiRequest("changePassword", passwordData),
  checkUsername: (username) => apiRequest("checkUsername", { username }),

  // OTP Login (Passwordless — Email Code)
  sendOTP: (email) => apiRequest("sendOTP", { email }),
  verifyOTP: async (email, otp) => {
    const data = await apiRequest("verifyOTP", { email, otp });
    if (data && data.token && data.user) {
      authState.setSession(data.token, data.user);
    }
    return data;
  },

  // PIN Login (4-Digit Quick Access)
  pinLogin: async (email, pin) => {
    const data = await apiRequest("pinLogin", { email, pin });
    if (data && data.token && data.user) {
      authState.setSession(data.token, data.user);
    }
    return data;
  },
  checkHasPin: (email) => apiRequest("checkHasPin", { email }),
  setPin: (pin) => apiRequest("setPin", { pin }),
  deletePin: () => apiRequest("deletePin", {}),

  // Verification
  resendVerificationEmail: (email, target_school_id) => apiRequest("resendVerification", { email, target_school_id }),
  verifyEmail: (token) => apiRequest("verifyEmail", { token }),

  // Dashboard & Profile
  getDashboard: (scope = {}) => {
    const d = scope?.type ? { scope_type: scope.type, scope_id: scope.id } : scope;
    return apiRequest("getDashboard", d);
  },
  getProfile: (userId) => apiRequest("getProfile", userId ? { userId } : {}),
  updateProfile: (profileData) => apiRequest("updateProfile", profileData),
  getGroupSettings: (scopeOrData = {}) => {
    const d = scopeOrData?.type ? { scope_type: scopeOrData.type, scope_id: scopeOrData.id } : scopeOrData;
    return apiRequest("getGroupSettings", d);
  },
  saveGroupSettings: (scope, settings) => apiRequest("saveGroupSettings", { scope_type: scope.type, scope_id: scope.id, settings }),
  updateGroupAvatar: (scopeData) => apiRequest("updateGroupAvatar", scopeData),

  // Directory
  getMembers: async (scope = {}) => {
    const d = scope?.type ? { scope_type: scope.type, scope_id: scope.id } : scope;
    return await apiRequest("getMembers", d) || [];
  },

  // Schools & Year Groups (Public)
  getSchools: () => apiRequest("getSchools"),
  getYearGroupsList: (school_id) => apiRequest("getYearGroups", { school_id }),

  // Newsletter
  getPosts: async (scope = {}) => {
    const d = scope?.type ? { scope_type: scope.type, scope_id: scope.id } : scope;
    let posts = await apiRequest("getPosts", d) || [];
    return posts.map(p => localActionedPosts[p.id] ? { ...p, status: localActionedPosts[p.id] } : p);
  },
  submitPost: (data) => apiRequest("submitPost", data),
  approvePost: (postId) => apiRequest("updatePostStatus", { post_id: postId, status: "Approved" }),
  returnPost: (postId, note) => apiRequest("updatePostStatus", { post_id: postId, status: "Returned", rejection_note: note }),
  dispatchNewsletter: (data = {}) => apiRequest("dispatchNewsletter", data),

  // Fundraising
  getCampaigns: (scope = {}) => {
    const d = scope?.type ? { scope_type: scope.type, scope_id: scope.id } : (typeof scope === 'string' ? { scope } : scope);
    return apiRequest("getCampaigns", d);
  },
  createCampaign: (data) => apiRequest("createCampaign", data),
  donate: (data) => apiRequest("submitDonation", data),
  approveDonation: (data) => apiRequest("approveDonation", data),
  adminAssignDonation: (data) => apiRequest("adminAssignDonation", data),
  getPendingPledges: () => apiRequest("getPendingPledges"),

  // Events
  getEvents: (scope = {}) => {
    const d = scope?.type ? { scope_type: scope.type, scope_id: scope.id } : (typeof scope === 'string' ? { scope } : scope);
    return apiRequest("getEvents", d);
  },
  createEvent: (data) => apiRequest("createEvent", data),
  rsvp: (eventId) => apiRequest("rsvpToEvent", { event_id: eventId }),

  // Board & Gallery
  getBoardMessages: (scope) => apiRequest("getBoardMessages", { scope_type: scope.type, scope_id: scope.id }),
  postBoardMessage: (messageData) => apiRequest("postBoardMessage", messageData),
  addBoardComment: (commentData) => apiRequest("addBoardComment", commentData),
  reactBoardMessage: (reactionData) => apiRequest("reactBoardMessage", reactionData),
  getAlbums: (scope) => apiRequest("getAlbums", { scope_type: scope.type, scope_id: scope.id }),
  createAlbum: (albumData) => apiRequest("createAlbum", albumData),
  getGalleryItems: (scope, albumId) => apiRequest("getGalleryItems", { scope_type: scope.type, scope_id: scope.id, album_id: albumId }),
  uploadImage: (uploadData) => apiRequest("uploadImage", uploadData),

  // Role Management
  assignTargetRole: (target_user_id, new_role) => apiRequest("assignTargetRole", { target_user_id, new_role }),

  // Tech Support
  getTickets: async () => await apiRequest("getTickets") || [],
  submitTicket: (ticketData) => apiRequest("submitTicket", ticketData),
  escalateTicket: (ticketId) => apiRequest("escalateTicket", { ticket_id: ticketId }),
  resolveTicket: (ticketId, resolution) => apiRequest("resolveTicket", { ticket_id: ticketId, resolution }),

  // ICUNI Labs Cockpit
  getSystemOverview: () => apiRequest("getSystemOverview"),
  getStaffRoster: () => apiRequest("getStaffRoster"),
  addStaffMember: (data) => apiRequest("addStaffMember", data),
  removeStaffMember: (userId) => apiRequest("removeStaffMember", { userId }),
  removeSchool: (schoolId) => apiRequest("removeSchool", { schoolId }),
  getSheetDataRaw: (sheetName, limit) => apiRequest("getSheetDataRaw", { sheetName, limit }),
  updateSheetCell: (sheetName, rowIndex, columnName, value) => apiRequest("updateSheetCell", { sheetName, rowIndex, columnName, value }),
  overrideMember: (memberId, field, value) => apiRequest("overrideMember", { memberId, field, value }),
  saveFeatureFlags: (flags) => apiRequest("saveFeatureFlags", { flags }),
  getFeatureFlags: () => apiRequest("getFeatureFlags"),

  // Provisioning
  onboardSchool: (schoolData) => apiRequest("onboardSchool", schoolData),
  adminCreateSchool: (schoolData) => apiRequest("adminCreateSchool", schoolData),
  adminProvisionMember: (data) => apiRequest("adminProvisionMember", data),
  adminProvisionYearGroup: (data) => apiRequest("adminProvisionYearGroup", data),
  adminProvisionClub: (data) => apiRequest("adminProvisionClub", data),
};
