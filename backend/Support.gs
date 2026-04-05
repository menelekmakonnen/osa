/**
 * OSA Platform — Tech Support & Tickets
 * Contains: getTickets, submitTicket, escalateTicket, resolveTicket
 */

function getTickets(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const userSchool = user.school || "UNKNOWN_SCHOOL";
  let tickets = getSheetData("tickets", schoolId).filter(t => (t.school || "") === userSchool);
  return { success: true, data: tickets.reverse() };
}

function submitTicket(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { issue_type, description, initial_tier } = data;
  if (!description || !issue_type) return { success: false, error: "Missing fields" };

  const sheet = getSheet("tickets", schoolId);
  const headers = getHeaders(sheet);
  let id = Utilities.getUuid();

  const newTicket = {
    id: id,
    author_id: user.id,
    author_name: user.name,
    school: user.school,
    issue_type: sanitizeInput(issue_type),
    description: sanitizeInput(description),
    status: "Open",
    current_tier: initial_tier || "Year Group",
    created_at: new Date().toISOString(),
    last_escalated_at: new Date().toISOString(),
    resolution: ""
  };

  sheet.appendRow(headers.map(h => newTicket[h] || ""));
  invalidateCache("tickets", schoolId);
  return { success: true, data: newTicket };
}

function escalateTicket(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { ticket_id } = data;
  if (!ticket_id) return { success: false, error: "Missing ticket_id" };

  const cached = getCachedSheetData("tickets", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;

  const tiers = ["Year Group", "School Admin", "ICUNI Labs"];

  for (let i = 1; i < rows.length; i++) {
    let row = rowToObject(rows[i], headers);
    if (row.id === ticket_id) {
      let idx = tiers.indexOf(row.current_tier);
      if (idx >= 0 && idx < tiers.length - 1) {
        let nextTier = tiers[idx + 1];
        sheet.getRange(i + 1, headers.indexOf("current_tier") + 1).setValue(nextTier);
        sheet.getRange(i + 1, headers.indexOf("status") + 1).setValue("Escalated");
        sheet.getRange(i + 1, headers.indexOf("last_escalated_at") + 1).setValue(new Date().toISOString());
        invalidateCache("tickets", schoolId);
        return { success: true, message: "Ticket escalated to " + nextTier };
      } else {
        return { success: false, error: "Cannot escalate further" };
      }
    }
  }
  return { success: false, error: "Ticket not found" };
}

function resolveTicket(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { ticket_id, resolution } = data;
  if (!ticket_id) return { success: false, error: "Missing ticket_id" };

  const cached = getCachedSheetData("tickets", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;

  for (let i = 1; i < rows.length; i++) {
    let row = rowToObject(rows[i], headers);
    if (row.id === ticket_id) {
      sheet.getRange(i + 1, headers.indexOf("status") + 1).setValue("Resolved");
      sheet.getRange(i + 1, headers.indexOf("resolution") + 1).setValue(sanitizeInput(resolution || ""));
      invalidateCache("tickets", schoolId);
      return { success: true, message: "Ticket resolved" };
    }
  }
  return { success: false, error: "Ticket not found" };
}
