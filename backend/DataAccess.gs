/**
 * OSA Platform — Data Access Layer
 * Contains: getMasterDB, getDB, getSheet, getHeaders, getSheetData, 
 *           getCachedSheetData, rowToObject, request-scoped caching
 */

// ==========================================
// Request-Scoped Cache (lives for one execution)
// ==========================================

const REQUEST_CACHE = {};

/**
 * Get cached sheet data for the current request.
 * Prevents re-reading the same sheet multiple times in a single API call.
 */
function getCachedSheetData(sheetName, schoolId) {
  const cacheKey = (schoolId || "_default") + "::" + sheetName;
  if (REQUEST_CACHE[cacheKey]) return REQUEST_CACHE[cacheKey];

  const sheet = getSheet(sheetName, schoolId);
  if (!sheet) {
    REQUEST_CACHE[cacheKey] = { sheet: null, headers: [], rows: [], data: [] };
    return REQUEST_CACHE[cacheKey];
  }

  const headers = getHeaders(sheet);
  const rawRows = sheet.getDataRange().getValues();
  const data = [];
  for (let i = 1; i < rawRows.length; i++) {
    if (!rawRows[i][0]) continue; // skip empty rows
    data.push(rowToObject(rawRows[i], headers));
  }

  REQUEST_CACHE[cacheKey] = { sheet, headers, rows: rawRows, data };
  return REQUEST_CACHE[cacheKey];
}

/**
 * Invalidate a specific cache entry (call after writes to that sheet)
 */
function invalidateCache(sheetName, schoolId) {
  const cacheKey = (schoolId || "_default") + "::" + sheetName;
  delete REQUEST_CACHE[cacheKey];
}

// ==========================================
// Core DB Access
// ==========================================

function getMasterDB() {
  return SpreadsheetApp.openById(MASTER_DB_ID);
}

function getDB(schoolId) {
  if (!schoolId || schoolId === "ICUNI_LABS" || schoolId === "MASTER") return getMasterDB();
  
  const cache = CacheService.getScriptCache();
  const cachedId = cache.get("school_db_" + schoolId);
  if (cachedId) {
    try {
      return SpreadsheetApp.openById(cachedId);
    } catch(e) {
      cache.remove("school_db_" + schoolId);
    }
  }

  const master = getMasterDB();
  const schoolsSheet = master.getSheetByName("schools");
  if (!schoolsSheet) return master;

  const headers = getHeaders(schoolsSheet);
  const rows = schoolsSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    let row = rowToObject(rows[i], headers);
    if (row.id === schoolId && row.spreadsheet_id) {
      cache.put("school_db_" + schoolId, row.spreadsheet_id, 21600); // 6h TTL
      return SpreadsheetApp.openById(row.spreadsheet_id);
    }
  }
  return master;
}

function getSheet(name, schoolId) {
  let db = getDB(schoolId);
  if (db.getId() === MASTER_DB_ID && name === "members") {
    name = "staff";
  }
  let sheet = db.getSheetByName(name);
  if (!sheet) {
    console.log("Sheet " + name + " not found in DB " + db.getId() + ". Auto-initializing schema.");
    INITIALIZE_SHEETS(db);
    sheet = db.getSheetByName(name);
  }
  return sheet;
}

function getHeaders(sheet) {
  if (!sheet) return [];
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(h => String(h).toLowerCase().replace(/\s+/g, '_'));
}

/**
 * Read all data from a sheet as objects.
 * Uses request-scoped cache to avoid duplicate reads.
 */
function getSheetData(name, schoolId) {
  return getCachedSheetData(name, schoolId).data;
}

function rowToObject(rowArray, headers) {
  let obj = {};
  headers.forEach((h, index) => {
    obj[h] = rowArray[index];
  });
  return obj;
}

function getYearGroupsData(schoolId) {
  let rows = getSheetData("year_groups", schoolId);
  let map = {};
  rows.forEach(r => map[r.id] = r);
  return map;
}

// ==========================================
// Tenant Resolution
// ==========================================

// Deprecated global — kept for backward compatibility.
// New code should pass schoolId explicitly.
let CURRENT_SCHOOL_ID = "ICUNI_LABS";

/**
 * Resolve the school ID for the current request.
 * Call once at the start of handleAction, then pass the result through.
 */
function resolveSchoolId(user, data) {
  // IT Department / ICUNI Staff can target any school
  if (user.role === "IT Department" || user.role === "ICUNI Staff") {
    if (data && data.target_school_id) {
      return data.target_school_id;
    }
  }
  
  if (user.school && user.school !== "MASTER") {
    return user.school;
  }
  
  return "ICUNI_LABS";
}
