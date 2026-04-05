/**
 * OSA Platform — Group Board & Messages
 * Contains: getBoardMessages, postBoardMessage, addBoardComment, reactBoardMessage
 */

function getBoardMessages(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || data.group_id || user.year_group_id;
  const userSchool = user.school || "UNKNOWN_SCHOOL";

  const allMembers = getSheetData("members", schoolId);
  const memMap = {};
  allMembers.forEach(m => memMap[m.id] = m);

  let msgs = getSheetData("board_messages", schoolId).filter(m => {
    if ((m.school || "") !== userSchool) return false;
    if (!((m.scope_type === scope_type && m.scope_id === scope_id) || m.group_id === scope_id)) return false;
    if (scope_type === "club") {
      let author = memMap[m.author_id];
      if (!author) return true;
      return checkSupergroup(user.year_group_id, author.year_group_id);
    }
    return true;
  });

  msgs.forEach(m => {
    m.comments = safeJsonParse(m.comments, []);
    m.reactions = safeJsonParse(m.reactions, []);
  });

  return { success: true, data: msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) };
}

function postBoardMessage(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { group_id, content } = data;
  if (!content) return { success: false, error: "Content empty" };

  const sheet = getSheet("board_messages", schoolId);
  const headers = getHeaders(sheet);
  let msgId = Utilities.getUuid();
  sheet.appendRow(headers.map(h => {
    if (h === "id") return msgId;
    if (h === "scope_type") return data.scope_type || "yeargroup";
    if (h === "scope_id") return data.scope_id || data.group_id;
    if (h === "group_id") return data.group_id || "";
    if (h === "school") return user.school;
    if (h === "author_id") return user.id;
    if (h === "author_name") return user.name;
    if (h === "content") return sanitizeInput(content);
    if (h === "comments") return "[]";
    if (h === "reactions") return "[]";
    if (h === "timestamp") return new Date().toISOString();
    return "";
  }));
  invalidateCache("board_messages", schoolId);
  return { success: true, data: { id: msgId } };
}

function addBoardComment(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { message_id, content } = data;
  if (!message_id || !content) return { success: false, error: "Missing fields" };

  const cached = getCachedSheetData("board_messages", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;

  for (let i = 1; i < rows.length; i++) {
    let row = rowToObject(rows[i], headers);
    if (row.id === message_id) {
      let comments = safeJsonParse(row.comments, []);
      comments.push({
        author_id: user.id,
        author_name: user.name,
        content: sanitizeInput(content),
        timestamp: new Date().toISOString()
      });
      sheet.getRange(i + 1, headers.indexOf("comments") + 1).setValue(JSON.stringify(comments));
      invalidateCache("board_messages", schoolId);
      return { success: true, message: "Comment added" };
    }
  }
  return { success: false, error: "Message not found" };
}

function reactBoardMessage(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { message_id, emoji } = data;
  if (!message_id || !emoji) return { success: false, error: "Missing fields" };

  const cached = getCachedSheetData("board_messages", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;

  for (let i = 1; i < rows.length; i++) {
    let row = rowToObject(rows[i], headers);
    if (row.id === message_id) {
      let reactions = safeJsonParse(row.reactions, []);
      let existing = reactions.find(r => r.emoji === emoji);
      if (existing) existing.count += 1;
      else reactions.push({ emoji: emoji, count: 1 });

      sheet.getRange(i + 1, headers.indexOf("reactions") + 1).setValue(JSON.stringify(reactions));
      invalidateCache("board_messages", schoolId);
      return { success: true, message: "Reaction added" };
    }
  }
  return { success: false, error: "Message not found" };
}
