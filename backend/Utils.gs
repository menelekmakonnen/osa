/**
 * OSA Platform — Shared Utilities & Constants
 * Contains: constants, hashPassword, safeJsonParse, jsonResponse, helpers
 */

const MASTER_DB_ID = "1mXY-MoxvTiUcDOtOYkDoG2PtaE2-aN0JpvpCrDA2Jcc";
const MASTER_FOLDER_ID = "1rqI7YHf7Z1pvSkUVgbx2d_Uj4JZbPpFO";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const PRODUCTION_URL = "https://osa.icuni.org";

/**
 * SHA-256 Password Hashing with per-user salt component
 * @param {string} password - The plaintext password
 * @param {string} [userId] - Optional user ID for per-user salt
 */
function hashPassword(password, userId) {
  const salt = "ICUNI_OSA_2026:" + (userId || "");
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt);
  return signature.map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

/**
 * Legacy hash function for backward compatibility with existing passwords
 * Uses the original shared salt so existing users can still log in
 */
function hashPasswordLegacy(password) {
  const salt = "ICUNI_OSA_SALT_2026";
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt);
  return signature.map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

/**
 * Build JSON response for GAS Web App
 */
function jsonResponse(obj) {
  let output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Safely parse JSON with a default fallback
 */
function safeJsonParse(str, defaultVal) {
  try {
    let parsed = JSON.parse(str);
    return parsed || defaultVal;
  } catch(e) {
    return defaultVal;
  }
}

/**
 * Sanitize user input to prevent XSS
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Generate a timestamped log entry (for future audit trail)
 */
function logAction(action, userId, details) {
  try {
    const masterSS = getMasterDB();
    const logSheet = masterSS.getSheetByName("logs");
    if (logSheet) {
      logSheet.appendRow([
        new Date().toISOString(),
        action,
        userId || "system",
        typeof details === 'string' ? details : JSON.stringify(details)
      ]);
    }
  } catch(e) {
    console.error("Failed to write audit log:", e);
  }
}
