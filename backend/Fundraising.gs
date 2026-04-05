/**
 * OSA Platform — Fundraising & Donations
 * Contains: getCampaigns, createCampaign, handleDonation, handleApproveDonation, 
 *           handleAdminAssignDonation, getPendingPledges
 */

function getCampaigns(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const scope_type = data.scope_type || "yeargroup";
  const scope_id = data.scope_id || user.year_group_id;
  const userSchool = user.school || "UNKNOWN_SCHOOL";

  let campaigns = getSheetData("campaigns", schoolId).filter(c => {
    if ((c.school || "") !== userSchool) return false;
    if (scope_type === 'yeargroup' && c.scope_id !== scope_id && c.scope_type !== 'school') return false;
    return true;
  });

  // Attach donation stats
  const donations = getSheetData("donations", schoolId);
  campaigns.forEach(c => {
    const campDonations = donations.filter(d => d.campaign_id === c.id && d.status === "Approved");
    c.raised_amount = campDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    c.donor_count = campDonations.length;
  });

  return { success: true, data: campaigns.sort((a, b) => new Date(b.id) - new Date(a.id)) };
}

function createCampaign(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { title, description, target_amount, currency, deadline, type } = data;
  if (!title) return { success: false, error: "Title required" };

  if (!isYGAdminOrAbove(user)) {
    return { success: false, error: "Unauthorized. Must be an admin/exec to create campaigns." };
  }

  const sheet = getSheet("campaigns", schoolId);
  const headers = getHeaders(sheet);
  const newId = Utilities.getUuid();
  const campaignObj = {
    id: newId,
    title: sanitizeInput(title),
    type: type || "crowdfund",
    description: sanitizeInput(description || ""),
    target_amount: target_amount || 0,
    currency: currency || "GHS",
    deadline: deadline || "",
    scope: data.scope || "",
    scope_type: data.scope_type || "yeargroup",
    scope_id: data.scope_id || user.year_group_id,
    school: user.school,
    status: "Active",
    raised_amount: 0,
    donor_count: 0,
    updates: "[]",
    created_by: user.name
  };
  sheet.appendRow(headers.map(h => campaignObj[h] !== undefined ? campaignObj[h] : ""));
  invalidateCache("campaigns", schoolId);
  return { success: true, data: campaignObj };
}

function handleDonation(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { campaign_id, amount, payment_method, is_anonymous } = data;
  if (!campaign_id || !amount) return { success: false, error: "Missing fields" };

  const sheet = getSheet("donations", schoolId);
  const headers = getHeaders(sheet);
  const newId = Utilities.getUuid();
  const donationObj = {
    id: newId,
    campaign_id: campaign_id,
    donor_id: user.id,
    amount: parseFloat(amount),
    timestamp: new Date().toISOString(),
    payment_method: payment_method || "Pledge",
    is_anonymous: is_anonymous ? "true" : "false",
    status: "Pending", // Pledges start as pending
    approved_by: ""
  };
  sheet.appendRow(headers.map(h => donationObj[h] !== undefined ? donationObj[h] : ""));
  invalidateCache("donations", schoolId);
  return { success: true, data: donationObj };
}

function handleApproveDonation(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { donation_id } = data;
  if (!donation_id) return { success: false, error: "Missing donation_id" };

  // Finance Execs (T2+) or School Admins can approve
  if (!isYGAdminOrAbove(user)) {
    return { success: false, error: "Unauthorized. Must be a Finance Exec or Admin." };
  }

  const cached = getCachedSheetData("donations", schoolId);
  const sheet = cached.sheet;
  const headers = cached.headers;
  const rows = cached.rows;

  for (let i = 1; i < rows.length; i++) {
    let row = rowToObject(rows[i], headers);
    if (row.id === donation_id) {
      sheet.getRange(i + 1, headers.indexOf("status") + 1).setValue("Approved");
      sheet.getRange(i + 1, headers.indexOf("approved_by") + 1).setValue(user.name);
      invalidateCache("donations", schoolId);
      return { success: true, message: "Donation approved" };
    }
  }
  return { success: false, error: "Donation not found" };
}

function handleAdminAssignDonation(user, data) {
  const schoolId = resolveSchoolId(user, data);
  const { campaign_id, donor_name, amount, payment_method } = data;
  if (!campaign_id || !amount) return { success: false, error: "Missing fields" };

  if (!isYGAdminOrAbove(user)) {
    return { success: false, error: "Unauthorized" };
  }

  const sheet = getSheet("donations", schoolId);
  const headers = getHeaders(sheet);
  const newId = Utilities.getUuid();
  sheet.appendRow(headers.map(h => {
    if (h === "id") return newId;
    if (h === "campaign_id") return campaign_id;
    if (h === "donor_id") return "admin_assigned";
    if (h === "amount") return parseFloat(amount);
    if (h === "timestamp") return new Date().toISOString();
    if (h === "payment_method") return payment_method || "Cash";
    if (h === "is_anonymous") return donor_name ? "false" : "true";
    if (h === "status") return "Approved";
    if (h === "approved_by") return user.name;
    return "";
  }));
  invalidateCache("donations", schoolId);
  return { success: true, message: "Donation assigned by admin" };
}

function getPendingPledges(user, data) {
  const schoolId = resolveSchoolId(user, data);
  if (!isYGAdminOrAbove(user)) {
    return { success: false, error: "Unauthorized" };
  }

  const donations = getSheetData("donations", schoolId);
  const pending = donations.filter(d => d.status === "Pending");
  return { success: true, data: pending };
}
