/**
 * OSA API Client
 * Interfaces with the Google Apps Script Backend
 */

// We look for a VITE_GAS_URL environment variable first, but fallback to our deployed URL
const GAS_URL = import.meta.env.VITE_GAS_URL || "https://script.google.com/macros/s/AKfycby88ZH_HMNAczLJwROj83yQ2jcEL7MURR9hlrKkTXc2KHRQpQnppZyY2Amq_IHKGAHp/exec";

// In-memory session state (as per requirements: no localStorage)
let sessionToken = null;
let currentUser = null;

export const authState = {
  getToken: () => sessionToken,
  getUser: () => currentUser,
  setSession: (token, user) => {
    sessionToken = token;
    currentUser = user;
  },
  clearSession: () => {
    sessionToken = null;
    currentUser = null;
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
      // Force a reload or redirect to login (handled typically in React Router context)
      window.dispatchEvent(new Event("osa-auth-expired"));
      throw new Error("Session expired. Please log in again.");
    }

    if (!result.success) {
      throw new Error(result.error || "Unknown API Error");
    }

    return result.data;

  } catch (error) {
    console.error(`[API Error] ${action}: `, error);
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
  getDashboard: () => apiRequest("getDashboard"),
  getPosts: () => apiRequest("getPosts"),
  getCampaigns: (scope = "my_school") => apiRequest("getCampaigns", { scope }),
  getEvents: (scope = "my_school") => apiRequest("getEvents", { scope }),
  getMembers: (scope = "my_school") => apiRequest("getMembers", { scope }),
  getProfile: () => apiRequest("getProfile"),
  getSchools: () => apiRequest("getSchools"), // Public
  getYearGroupsList: () => apiRequest("getYearGroupsList"), // Public

  // POST mutations
  updateProfile: (profileData) => apiRequest("updateProfile", profileData),
  submitPost: (postData) => apiRequest("submitPost", postData),
  approvePost: (postId) => apiRequest("approvePost", { post_id: postId }),
  returnPost: (postId, note) => apiRequest("returnPost", { post_id: postId, note }),
  dispatchNewsletter: () => apiRequest("dispatchNewsletter"),
  createCampaign: (campaignData) => apiRequest("createCampaign", campaignData),
  donate: (campaignId, amount) => apiRequest("donate", { campaign_id: campaignId, amount }),
  createEvent: (eventData) => apiRequest("createEvent", eventData),
  rsvp: (eventId) => apiRequest("rsvp", { event_id: eventId }),

  // Board & Gallery
  getBoardMessages: (groupId) => apiRequest("getBoardMessages", { group_id: groupId }),
  postBoardMessage: (messageData) => apiRequest("postBoardMessage", messageData),
  addBoardComment: (commentData) => apiRequest("addBoardComment", commentData),
  reactBoardMessage: (reactionData) => apiRequest("reactBoardMessage", reactionData),
  getAlbums: (groupId) => apiRequest("getAlbums", { group_id: groupId }),
  createAlbum: (albumData) => apiRequest("createAlbum", albumData),
  getGalleryItems: (groupId, albumId) => apiRequest("getGalleryItems", { group_id: groupId, album_id: albumId }),
  uploadImage: (uploadData) => apiRequest("uploadImage", uploadData)
};
