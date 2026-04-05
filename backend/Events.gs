/**
 * OSA Platform — Events & RSVPs
 * Contains: getEvents, createEvent, rsvpToEvent
 */

function getEvents(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;
  const userSchool = user.school || "UNKNOWN_SCHOOL";

  let events = getSheetData("events", schoolId).filter(ev => {
    if ((ev.school || "") !== userSchool) return false;
    if (scope_type === 'yeargroup' && ev.scope_id !== scope_id && ev.scope_type !== 'school') return false;
    return true;
  });

  // Attach RSVP counts
  const rsvps = getSheetData("rsvps", schoolId);
  events.forEach(ev => {
    ev.rsvp_count = rsvps.filter(r => r.event_id === ev.id).length;
    ev.user_rsvpd = rsvps.some(r => r.event_id === ev.id && r.user_id === user.id);
  });

  return { success: true, data: events.sort((a, b) => new Date(b.date) - new Date(a.date)) };
}

function createEvent(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { title, description, date, time, venue, virtual_link, max_attendees, type } = data;
  if (!title || !date) return { success: false, error: "Title and date required" };

  if (!isYGAdminOrAbove(user)) {
    return { success: false, error: "Unauthorized. Must be an admin/exec to create events." };
  }

  const sheet = getSheet("events", schoolId);
  const headers = getHeaders(sheet);
  const newId = Utilities.getUuid();
  const eventObj = {
    id: newId,
    title: sanitizeInput(title),
    type: type || "general",
    description: sanitizeInput(description || ""),
    date: date,
    time: time || "",
    virtual_link: virtual_link || "",
    venue: sanitizeInput(venue || ""),
    scope: data.scope || "",
    scope_type: data.scope_type || "yeargroup",
    scope_id: data.scope_id || user.year_group_id,
    school: user.school,
    max_attendees: max_attendees || "",
    status: "Active",
    created_by: user.name
  };
  sheet.appendRow(headers.map(h => eventObj[h] !== undefined ? eventObj[h] : ""));
  invalidateCache("events", schoolId);
  return { success: true, data: eventObj };
}

function rsvpToEvent(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { event_id } = data;
  if (!event_id) return { success: false, error: "Missing event_id" };

  const rsvps = getSheetData("rsvps", schoolId);
  const existing = rsvps.find(r => r.event_id === event_id && r.user_id === user.id);
  if (existing) return { success: false, error: "Already RSVP'd" };

  // Check max attendees
  const events = getSheetData("events", schoolId);
  const event = events.find(e => e.id === event_id);
  if (event && event.max_attendees) {
    const currentCount = rsvps.filter(r => r.event_id === event_id).length;
    if (currentCount >= parseInt(event.max_attendees)) {
      return { success: false, error: "Event is at capacity" };
    }
  }

  const sheet = getSheet("rsvps", schoolId);
  const headers = getHeaders(sheet);
  const newId = Utilities.getUuid();
  sheet.appendRow(headers.map(h => {
    if (h === "id") return newId;
    if (h === "event_id") return event_id;
    if (h === "user_id") return user.id;
    if (h === "timestamp") return new Date().toISOString();
    return "";
  }));
  invalidateCache("rsvps", schoolId);
  return { success: true, message: "RSVP confirmed" };
}
