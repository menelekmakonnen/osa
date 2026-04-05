/**
 * OSA Platform — Gallery & Image Uploads
 * Contains: uploadImage, getAlbums, createAlbum, getGalleryItems, 
 *           updateGroupAvatar, getOrCreateUploadFolder (lazy creation)
 */

// ==========================================
// Lazy Drive Folder Creation
// ==========================================

/**
 * Lazily get or create the correct upload folder for a given scope.
 * Folder hierarchy is built on-demand, not at registration time.
 * 
 * Structure:
 *   School Folder/
 *   ├── Members/
 *   │   └── MemberName [uuid]/           ← profile pics
 *   ├── Year Groups/
 *   │   └── 2012 - The Pioneers/
 *   │       ├── Gallery/
 *   │       │   └── AlbumName/           ← album-specific uploads
 *   │       └── Board/                   ← board attachments
 *   └── School Gallery/                  ← school-wide uploads
 */
function getOrCreateUploadFolder(schoolId, scopeType, scopeId, subfolderName) {
  try {
    // Get school's root Drive folder
    const schoolData = getSheetData("schools", "ICUNI_LABS");
    const school = schoolData.find(s => s.id === schoolId);
    if (!school || !school.drive_folder_id) {
      // Fallback to generic OSA_Uploads folder
      return getFallbackUploadFolder(scopeId || "general");
    }

    let schoolFolder;
    try {
      schoolFolder = DriveApp.getFolderById(school.drive_folder_id);
    } catch(e) {
      return getFallbackUploadFolder(scopeId || "general");
    }

    // Route based on scope type
    if (scopeType === "profile_pics" || scopeType === "profile_covers") {
      // School Folder / Members / MemberName /
      const membersFolder = getOrCreateSubfolder(schoolFolder, "Members");
      const memberFolder = getOrCreateSubfolder(membersFolder, subfolderName || scopeId);
      return memberFolder;
    }

    if (scopeType === "yeargroup" || !scopeType) {
      // School Folder / Year Groups / YG Label / Gallery / [AlbumName]
      const ygFolder = getOrCreateSubfolder(schoolFolder, "Year Groups");
      const ygLabel = subfolderName || scopeId || "General";
      const thisYGFolder = getOrCreateSubfolder(ygFolder, ygLabel);
      const galleryFolder = getOrCreateSubfolder(thisYGFolder, "Gallery");
      return galleryFolder;
    }

    if (scopeType === "school") {
      // School Folder / School Gallery / [AlbumName]
      const schoolGalleryFolder = getOrCreateSubfolder(schoolFolder, "School Gallery");
      if (subfolderName) {
        return getOrCreateSubfolder(schoolGalleryFolder, subfolderName);
      }
      return schoolGalleryFolder;
    }

    if (scopeType === "club") {
      // School Folder / Clubs / ClubName / Gallery
      const clubsFolder = getOrCreateSubfolder(schoolFolder, "Clubs");
      const clubFolder = getOrCreateSubfolder(clubsFolder, scopeId || "General");
      const galleryFolder = getOrCreateSubfolder(clubFolder, "Gallery");
      return galleryFolder;
    }

    if (scopeType === "board") {
      // School Folder / Year Groups / YG Label / Board
      const ygFolder = getOrCreateSubfolder(schoolFolder, "Year Groups");
      const thisYGFolder = getOrCreateSubfolder(ygFolder, subfolderName || scopeId || "General");
      const boardFolder = getOrCreateSubfolder(thisYGFolder, "Board");
      return boardFolder;
    }

    // Generic fallback
    return getOrCreateSubfolder(schoolFolder, scopeId || "Uploads");
  } catch(e) {
    console.error("getOrCreateUploadFolder error:", e);
    return getFallbackUploadFolder(scopeId || "general");
  }
}

/**
 * Get or create a subfolder within a parent folder.
 */
function getOrCreateSubfolder(parentFolder, name) {
  const iter = parentFolder.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  return parentFolder.createFolder(name);
}

/**
 * Fallback: use the flat OSA_Uploads folder if school folder is unavailable.
 */
function getFallbackUploadFolder(groupId) {
  let rootFolder;
  const folders = DriveApp.getFoldersByName("OSA_Uploads");
  if (folders.hasNext()) {
    rootFolder = folders.next();
  } else {
    rootFolder = DriveApp.createFolder("OSA_Uploads");
  }
  return getOrCreateSubfolder(rootFolder, groupId);
}

// ==========================================
// Image Upload
// ==========================================

function uploadImage(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { group_id, album_id, album_name, image_base64, file_name } = data;
  if (!image_base64) return { success: false, error: "No image provided" };

  try {
    let targetFolder;
    
    // Route to correct folder based on context
    if (group_id === "profile_pics" || group_id === "profile_covers") {
      targetFolder = getOrCreateUploadFolder(
        user.school, group_id, user.id, user.name + " [" + user.id.substring(0, 8) + "]"
      );
    } else if (group_id === "group_avatars") {
      targetFolder = getOrCreateUploadFolder(
        user.school, data.scope_type || "yeargroup", data.scope_id || group_id, "Avatars"
      );
    } else {
      // Year group / school / club gallery
      const ygData = getYearGroupsData(schoolId);
      const ygLabel = ygData[group_id] ? (ygData[group_id].year + " - " + (ygData[group_id].nickname || "")) : group_id;
      
      targetFolder = getOrCreateUploadFolder(
        user.school, data.scope_type || "yeargroup", data.scope_id || group_id, ygLabel
      );
      
      // If album is specified, create album subfolder
      if (album_id && album_name) {
        targetFolder = getOrCreateSubfolder(targetFolder, album_name);
      }
    }

    // Decode and save
    const base64Data = image_base64.split(',')[1] || image_base64;
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/jpeg", file_name || "upload.jpg");
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const url = "https://lh3.googleusercontent.com/d/" + file.getId();

    // Log the upload in gallery (not for profile pics)
    if (group_id !== "profile_pics" && group_id !== "profile_covers" && group_id !== "group_avatars") {
      const gSheet = getSheet("galleries", schoolId);
      const headers = getHeaders(gSheet);

      const newImageObj = {
        id: Utilities.getUuid(),
        scope_type: data.scope_type || "yeargroup",
        scope_id: data.scope_id || group_id,
        group_id: group_id,
        album_id: album_id || "",
        uploaded_by_id: user.id,
        uploaded_by_name: user.name,
        url: url,
        timestamp: new Date().toISOString(),
        school: user.school
      };

      gSheet.appendRow(headers.map(h => newImageObj[h] !== undefined ? newImageObj[h] : ""));
      invalidateCache("galleries", schoolId);
      return { success: true, data: newImageObj };
    }

    return { success: true, data: { url: url } };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// Albums & Gallery Items
// ==========================================

function getAlbums(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const userSchool = user.school || "UNKNOWN_SCHOOL";
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;

  const allMembers = getSheetData("members", schoolId);
  const memMap = {};
  allMembers.forEach(m => memMap[m.id] = m);

  const albums = getSheetData("albums", schoolId).filter(a => {
    if ((a.school || "") !== userSchool) return false;
    if (!((a.scope_type === scope_type && a.scope_id === scope_id) || a.group_id === scope_id)) return false;
    if (scope_type === "club") {
      let creator = memMap[a.created_by_id];
      if (!creator) return true;
      return checkSupergroup(user.year_group_id, creator.year_group_id);
    }
    return true;
  });
  return { success: true, data: albums.reverse() };
}

function createAlbum(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { group_id, name, description } = data;
  if (!name) return { success: false, error: "Name required" };

  const sheet = getSheet("albums", schoolId);
  const headers = getHeaders(sheet);
  let id = Utilities.getUuid();
  const newAlbumObj = {
    id: id,
    scope_type: data.scope_type || "yeargroup",
    scope_id: data.scope_id || data.group_id,
    group_id: data.group_id || "",
    school: user.school,
    name: sanitizeInput(name),
    description: sanitizeInput(description || ""),
    created_by_id: user.id,
    created_by_name: user.name,
    timestamp: new Date().toISOString()
  };
  sheet.appendRow(headers.map(h => newAlbumObj[h] !== undefined ? newAlbumObj[h] : ""));
  invalidateCache("albums", schoolId);
  return { success: true, data: newAlbumObj };
}

function getGalleryItems(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const userSchool = user.school || "UNKNOWN_SCHOOL";
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;

  const allMembers = getSheetData("members", schoolId);
  const memMap = {};
  allMembers.forEach(m => memMap[m.id] = m);

  let images = getSheetData("galleries", schoolId).filter(g => {
    if ((g.school || "") !== userSchool) return false;
    if (!((g.scope_type === scope_type && g.scope_id === scope_id) || g.group_id === scope_id)) return false;
    if (scope_type === "club") {
      let uploader = memMap[g.uploaded_by_id];
      if (!uploader) return true;
      return checkSupergroup(user.year_group_id, uploader.year_group_id);
    }
    return true;
  });
  if (data.album_id) {
    images = images.filter(g => g.album_id === data.album_id);
  }
  return { success: true, data: images.reverse() };
}

function updateGroupAvatar(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { scope_type, scope_id, url } = data;
  if (!url) return { success: false, error: "No URL provided" };

  if (!isYGAdminOrAbove(user)) {
    return { success: false, error: "Unauthorized. Must be an admin/exec." };
  }

  let sheetName = scope_type === "school" ? "schools" : "year_groups";
  let targetId = scope_type === "school" ? user.school : scope_id;

  const sheet = getSheet(sheetName, sheetName === "schools" ? "ICUNI_LABS" : schoolId);
  const headers = getHeaders(sheet);
  const rows = sheet.getDataRange().getValues();

  let avatarIndex = headers.indexOf("avatar");
  if (avatarIndex === -1) {
    sheet.getRange(1, headers.length + 1).setValue("avatar");
    avatarIndex = headers.length;
  }

  for (let i = 1; i < rows.length; i++) {
    let rowObj = rowToObject(rows[i], headers);
    let match = false;
    if (sheetName === "schools" && rowObj.name === targetId) match = true;
    if (sheetName === "year_groups" && rowObj.id === targetId) match = true;

    if (match) {
      sheet.getRange(i + 1, avatarIndex + 1).setValue(url);
      return { success: true, message: "Avatar updated" };
    }
  }
  return { success: false, error: "Group not found to update." };
}
