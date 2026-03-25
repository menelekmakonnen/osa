const fs = require('fs');
let code = fs.readFileSync('Code.gs', 'utf8');

const dbHelpers = `
function hashPassword(password) {
  const salt = "ICUNI_OSA_SALT_2026";
  const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + salt);
  return signature.map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

const MASTER_DB_ID = "1mXY-MoxvTiUcDOtOYkDoG2PtaE2-aN0JpvpCrDA2Jcc";
const MASTER_FOLDER_ID = "1rqI7YHf7Z1pvSkUVgbx2d_Uj4JZbPpFO";

function getMasterDB() {
  return SpreadsheetApp.openById(MASTER_DB_ID);
}

function getDB(schoolId) {
  if (!schoolId || schoolId === "ICUNI_LABS") return getMasterDB();
  const cache = CacheService.getScriptCache();
  const cachedId = cache.get("school_db_" + schoolId);
  if (cachedId) return SpreadsheetApp.openById(cachedId);

  const master = getMasterDB();
  const schoolsSheet = master.getSheetByName("schools");
  if (!schoolsSheet) return master;
  
  const headers = getHeaders(schoolsSheet);
  const rows = schoolsSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
     let row = rowToObject(rows[i], headers);
     if (row.id === schoolId && row.spreadsheet_id) {
         cache.put("school_db_" + schoolId, row.spreadsheet_id, 21600);
         return SpreadsheetApp.openById(row.spreadsheet_id);
     }
  }
  return master;
}

function getSheet(name, schoolId) {
  let db = getDB(schoolId);
  let sheet = db.getSheetByName(name);
  if (!sheet) {
      console.log("Sheet " + name + " not found in DB " + db.getId() + ". Auto-initializing schema.");
      INITIALIZE_SHEETS(db);
      sheet = db.getSheetByName(name);
  }
  return sheet;
}
`;

// Replace DB blocks
const regexDB = /function getDB\(\)[\s\S]*?(?=function getHeaders)/m;
code = code.replace(regexDB, dbHelpers + "\\n");

// Fix calls
code = code.replace(/getSheet\("([^"]+)"\)/g, `getSheet("$1", typeof user !== 'undefined' ? user.school : null)`);
code = code.replace(/getSheetData\("([^"]+)"\)/g, `getSheetData("$1", typeof user !== 'undefined' ? user.school : null)`);

// Remove old handleLogin and replace with multi-sheet
const newLogin = `
function handleLogin(data) {
  const { email, password } = data;
  if (!email || !password) return { success: false, error: "Missing credentials" };
  
  const hash = hashPassword(password);
  const masterSS = getMasterDB();
  const mSheet = masterSS.getSheetByName("members");
  const headers = getHeaders(mSheet);
  const rows = mSheet.getDataRange().getValues();
  
  // 1. Check Master Form (Staff & Central Users)
  for (let i = 1; i < rows.length; i++) {
    const rowObj = rowToObject(rows[i], headers);
    if (String(rowObj.email).toLowerCase() === String(email).toLowerCase()) {
      if (rowObj.password === hash || rowObj.password === password) {
        return buildLoginSuccess(mSheet, i + 1, headers, rowObj);
      } else {
        return { success: false, error: "Invalid email or password." };
      }
    }
  }

  // 2. Iterate Schools
  const sSheet = masterSS.getSheetByName("schools");
  const sHeaders = getHeaders(sSheet);
  const sRows = sSheet.getDataRange().getValues();
  for(let j=1; j<sRows.length; j++){
      let sRow = rowToObject(sRows[j], sHeaders);
      if(!sRow.spreadsheet_id) continue;
      try {
         const schoolSS = SpreadsheetApp.openById(sRow.spreadsheet_id);
         const schoolMSheet = schoolSS.getSheetByName("members");
         if(!schoolMSheet) continue;
         let smHeaders = getHeaders(schoolMSheet);
         let smRows = schoolMSheet.getDataRange().getValues();
         for(let k=1; k<smRows.length; k++){
            let uRow = rowToObject(smRows[k], smHeaders);
            if(String(uRow.email).toLowerCase() === String(email).toLowerCase()) {
               if(uRow.password === hash || uRow.password === password) {
                  return buildLoginSuccess(schoolMSheet, k + 1, smHeaders, uRow);
               } else {
                  return { success: false, error: "Invalid email or password" };
               }
            }
         }
      } catch(e) {}
  }
  return { success: false, error: "Invalid email or password" };
}

function buildLoginSuccess(sheet, rowIndex, headers, rowObj) {
    const token = Utilities.getUuid();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    sheet.getRange(rowIndex, headers.indexOf("session_token") + 1).setValue(token);
    sheet.getRange(rowIndex, headers.indexOf("token_expiry") + 1).setValue(expiry.toISOString());
    delete rowObj.password;
    delete rowObj.session_token;
    return { success: true, data: { token: token, user: rowObj } };
}
`;

const loginRegex = /function handleLogin\(data\) \{[\s\S]*?(?=function handleRegister)/m;
code = code.replace(loginRegex, newLogin + "\\n");

fs.writeFileSync('Code2.gs', code);
console.log("Success");
