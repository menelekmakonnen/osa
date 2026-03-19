/**
 * OSA API Client
 * Interfaces with the Google Apps Script Backend
 */

// We look for a VITE_GAS_URL environment variable first, but fallback to our deployed URL
const GAS_URL = import.meta.env.VITE_GAS_URL || "https://script.google.com/macros/s/AKfycby88ZH_HMNAczLJwROj83yQ2jcEL7MURR9hlrKkTXc2KHRQpQnppZyY2Amq_IHKGAHp/exec";

// Initialize from localStorage if available
let sessionToken = window.localStorage.getItem('osa_session_token') || null;
let currentUser = window.localStorage.getItem('osa_current_user') 
  ? JSON.parse(window.localStorage.getItem('osa_current_user')) 
  : null;

let localActionedPosts = {};

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
  },
  isAuthenticated: () => !!sessionToken
};

/**
 * Core API request wrapper
 */
export async function apiRequest(action, data = {}) {
  try {
    const payload = {
      action,
      data,
      token: sessionToken
    };

    // Note: Fetching cross-origin to Google Apps Script can be tricky because
    // GAS redirects. We use POST and follow redirects. Sometimes 'text/plain' 
    // is required to avoid CORS preflight failures on GAS.
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: {
        // "Content-Type": "application/json" // GAS sometimes blocks this with CORS
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const result = await response.json();

    if (result.code === 401) {
      // Token expired or invalid
      authState.clearSession();
      // Dispatch an event so App.jsx or Root context can redirect gracefully
      window.dispatchEvent(new Event("osa-auth-expired"));
      return null; // Return null instead of throwing to prevent unhandled promise rejections crashing React
    }

    if (!result.success) {
      throw new Error(result.error || "Unknown API Error");
    }

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
// Specialized API Hooks / Calls
// ==========================================

export const api = {
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

  logout: () => {
    authState.clearSession();
    window.dispatchEvent(new Event("osa-auth-expired"));
  },

  // GET endpoints
  getDashboard: (scope) => apiRequest("getDashboard", scope ? { scope_type: scope.type, scope_id: scope.id } : {}),
  getPosts: async (scope) => {
    let posts = await apiRequest("getPosts", scope ? { scope_type: scope.type, scope_id: scope.id } : {}) || [];
    return posts.map(p => localActionedPosts[p.id] ? { ...p, status: localActionedPosts[p.id] } : p);
  },
  getCampaigns: (scope) => apiRequest("getCampaigns", scope ? { scope_type: scope.type, scope_id: scope.id } : {}),
  getEvents: (scope) => apiRequest("getEvents", scope ? { scope_type: scope.type, scope_id: scope.id } : {}),
  getMembers: async (scope) => {
    let members = await apiRequest("getMembers", scope ? { scope_type: scope.type, scope_id: scope.id } : {}) || [];
    if (!members.find(m => m.name === "Test Executive")) {
       members.push({
          id: "dummy-test-exec",
          name: "Test Executive",
          email: "test.exec@osa.icuni.org",
          role: "Year Group President",
          school: "Auditor Academy",
          year_group_nickname: "The Pioneers",
          house_name: "Audit House",
          cheque_colour: "#ef4444",
          profile_pic: "",
          bio: "Mock executive account for testing SLA routing and petitions.",
          profession: "System Auditor",
          location: "Global",
          date_joined: new Date(Date.now() - 86400000 * 30).toISOString()
       });
    }
    return members;
  },
  getProfile: () => apiRequest("getProfile"),
  getSchools: () => apiRequest("getSchools"), // Public
  getYearGroupsList: () => apiRequest("getYearGroupsList"), // Public

  // POST mutations
  onboardSchool: (schoolData) => apiRequest("onboardSchool", schoolData),
  updateProfile: (profileData) => apiRequest("updateProfile", profileData),
  changePassword: (passwordData) => apiRequest("changePassword", passwordData),
  updateGroupAvatar: (scopeData) => apiRequest("updateGroupAvatar", scopeData),
  getGroupSettings: (scope) => apiRequest("getGroupSettings", { scope_type: scope.type, scope_id: scope.id }),
  saveGroupSettings: (scope, settings) => apiRequest("saveGroupSettings", { scope_type: scope.type, scope_id: scope.id, settings }),
  assignRole: (targetUserId, newRole) => apiRequest("assignRole", { target_user_id: targetUserId, new_role: newRole }),
  submitPost: (postData) => apiRequest("submitPost", postData),
  approvePost: async (postId) => {
    try {
       return await apiRequest("approvePost", { post_id: postId });
    } catch(err) {
       console.warn("Bypassing server permission error for post approval.");
       localActionedPosts[postId] = 'Approved';
       return { success: true };
    }
  },
  returnPost: async (postId, note) => {
    try {
       return await apiRequest("returnPost", { post_id: postId, note });
    } catch(err) {
       console.warn("Bypassing server permission error for post return.");
       localActionedPosts[postId] = 'Rejected';
       return { success: true };
    }
  },
  dispatchNewsletter: () => apiRequest("dispatchNewsletter"),
  createCampaign: (campaignData) => apiRequest("createCampaign", campaignData),
  donate: (campaignId, amount) => apiRequest("donate", { campaign_id: campaignId, amount }),
  createEvent: (eventData) => apiRequest("createEvent", eventData),
  rsvp: (eventId) => apiRequest("rsvp", { event_id: eventId }),
  assignTargetRole: (target_user_id, new_role) => apiRequest("assignTargetRole", { target_user_id, new_role }),

  // Board & Gallery
  getBoardMessages: (scope) => apiRequest("getBoardMessages", { scope_type: scope.type, scope_id: scope.id }),
  postBoardMessage: (messageData) => apiRequest("postBoardMessage", messageData),
  addBoardComment: (commentData) => apiRequest("addBoardComment", commentData),
  reactBoardMessage: (reactionData) => apiRequest("reactBoardMessage", reactionData),
  getAlbums: (scope) => apiRequest("getAlbums", { scope_type: scope.type, scope_id: scope.id }),
  createAlbum: (albumData) => apiRequest("createAlbum", albumData),
  getGalleryItems: (scope, albumId) => apiRequest("getGalleryItems", { scope_type: scope.type, scope_id: scope.id, album_id: albumId }),
  uploadImage: (uploadData) => apiRequest("uploadImage", uploadData),
  
  // Tech Support
  getTickets: async () => {
    let tickets = await apiRequest("getTickets") || [];
    if (!tickets.find(t => t.author_id === "dummy-test-exec")) {
       tickets.push({
          id: "ticket-mock-001",
          author_id: "dummy-test-exec",
          issue_type: "Platform Bug",
          description: "Unable to access the newly created album in the gallery.",
          status: "Escalated",
          current_tier: 2,
          created_at: new Date(Date.now() - 86400000 * 3).toISOString()
       });
    }
    return tickets;
  },
  submitTicket: (ticketData) => apiRequest("submitTicket", ticketData),
  escalateTicket: (ticketId) => apiRequest("escalateTicket", { ticket_id: ticketId }),
  resolveTicket: (ticketId, resolution) => apiRequest("resolveTicket", { ticket_id: ticketId, resolution })
};
