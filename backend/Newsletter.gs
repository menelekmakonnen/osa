/**
 * OSA Platform — Newsletter & Posts
 * Contains: getPosts, submitPost, updatePostStatus, dispatchNewsletter
 */

function getPosts(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;
  const userSchool = user.school || "UNKNOWN_SCHOOL";

  let posts = getSheetData("posts", schoolId).filter(p => {
    if ((p.school || "") !== userSchool) return false;
    if (scope_type === 'yeargroup' && p.scope_id !== scope_id && p.scope_type !== 'school') return false;
    return true;
  });

  return { success: true, data: posts.sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date)) };
}

function submitPost(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { title, content, category } = data;
  if (!title || !content) return { success: false, error: "Title and content required" };

  const sheet = getSheet("posts", schoolId);
  const headers = getHeaders(sheet);
  const newId = Utilities.getUuid();
  const postObj = {
    id: newId,
    title: sanitizeInput(title),
    category: sanitizeInput(category || "General"),
    content: sanitizeInput(content),
    author_id: user.id,
    author_name: user.name,
    scope_type: data.scope_type || "yeargroup",
    scope_id: data.scope_id || user.year_group_id,
    school: user.school,
    submission_date: new Date().toISOString(),
    status: isYGAdminOrAbove(user) ? "Approved" : "Pending",
    newsletter_month: "",
    rejection_note: ""
  };
  sheet.appendRow(headers.map(h => postObj[h] !== undefined ? postObj[h] : ""));
  invalidateCache("posts", schoolId);
  return { success: true, data: postObj };
}

function updatePostStatus(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { post_id, status, rejection_note } = data;
  if (!post_id || !status) return { success: false, error: "Missing fields" };

  if (!isYGAdminOrAbove(user)) {
    return { success: false, error: "Unauthorized" };
  }

  const cached = getCachedSheetData("posts", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;

  for (let i = 1; i < rows.length; i++) {
    let row = rowToObject(rows[i], headers);
    if (row.id === post_id) {
      sheet.getRange(i + 1, headers.indexOf("status") + 1).setValue(status);
      if (rejection_note) {
        sheet.getRange(i + 1, headers.indexOf("rejection_note") + 1).setValue(sanitizeInput(rejection_note));
      }
      invalidateCache("posts", schoolId);
      return { success: true, message: "Post " + status.toLowerCase() };
    }
  }
  return { success: false, error: "Post not found" };
}

function dispatchNewsletter(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { month, scope_type, scope_id } = data;
  if (!month) return { success: false, error: "Month required" };

  if (!isYGAdminOrAbove(user)) {
    return { success: false, error: "Unauthorized" };
  }

  const sType = scope_type || "yeargroup";
  const sId = scope_id || user.year_group_id;
  const userSchool = user.school || "UNKNOWN_SCHOOL";

  const posts = getSheetData("posts", schoolId).filter(p => {
    if ((p.school || "") !== userSchool) return false;
    if (p.status !== "Approved") return false;
    if (p.newsletter_month && p.newsletter_month !== month) return false;
    if (sType === 'yeargroup' && p.scope_id !== sId && p.scope_type !== 'school') return false;
    return true;
  });

  if (posts.length === 0) return { success: false, error: "No approved posts found for " + month };

  // Get recipients
  const members = getSheetData("members", schoolId).filter(m => {
    if ((m.school || "") !== userSchool) return false;
    if (!m.email) return false;
    if (sType === 'yeargroup' && m.year_group_id !== sId) return false;
    return true;
  });

  // Build HTML
  let postsHtml = posts.map(p =>
    '<div style="margin-bottom: 24px; border-bottom: 1px solid #E2E8F0; padding-bottom: 16px;">' +
      '<h3 style="color: #1E293B; font-size: 18px; margin: 0 0 8px;">' + p.title + '</h3>' +
      '<p style="color: #64748B; font-size: 12px; margin: 0 0 8px;">By ' + p.author_name + ' • ' + p.category + '</p>' +
      '<p style="color: #334155; font-size: 14px; line-height: 1.6;">' + (p.content || '').substring(0, 500) + '</p>' +
    '</div>'
  ).join('');

  const emailHtml = '<div style="font-family: \'Segoe UI\', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: white; border-radius: 12px;">' +
    '<h1 style="color: #0F172A; font-size: 24px; margin: 0 0 8px;">Newsletter — ' + month + '</h1>' +
    '<p style="color: #64748B; font-size: 14px; margin: 0 0 24px;">Compiled for your community</p>' +
    '<hr style="border: none; border-top: 1px solid #E2E8F0;" />' +
    postsHtml +
    '<p style="color: #94A3B8; font-size: 12px; text-align: center; margin-top: 32px;">— OSA Platform</p></div>';

  let sent = 0;
  members.forEach(m => {
    try {
      MailApp.sendEmail({ to: m.email, subject: "OSA Newsletter — " + month, htmlBody: emailHtml, name: "OSA Newsletter" });
      sent++;
    } catch(e) {}
  });

  // Log dispatch
  const nlSheet = getSheet("newsletters", schoolId);
  const nlHeaders = getHeaders(nlSheet);
  const nlId = Utilities.getUuid();
  nlSheet.appendRow(nlHeaders.map(h => {
    if (h === "id") return nlId;
    if (h === "month") return month;
    if (h === "scope_type") return sType;
    if (h === "scope_id") return sId;
    if (h === "post_ids") return JSON.stringify(posts.map(p => p.id));
    if (h === "recipient_count") return sent;
    if (h === "dispatched_by") return user.name;
    if (h === "timestamp") return new Date().toISOString();
    return "";
  }));

  return { success: true, data: { sent: sent, postCount: posts.length } };
}
