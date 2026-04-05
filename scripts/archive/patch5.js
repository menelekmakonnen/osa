const fs = require('fs');

let data = fs.readFileSync('backend/Code.gs', 'utf8');

const newCode = `function getCampaignPledges(user, data) {
   const { campaign_id } = data;
   const campSheet = getSheet('campaigns', CURRENT_SCHOOL_ID);
   const cRows = campSheet.getDataRange().getValues();
   const cHeaders = getHeaders(campSheet);
   let campaign = null;
   for(let i=1; i<cRows.length; i++){ 
       let c = rowToObject(cRows[i], cHeaders); 
       if(c.id===campaign_id){ campaign=c; break; } 
   }
   if(!campaign) return { success: false, error: 'Campaign not found' };

   // Check authorization
   if(!isCampaignAdmin(user, campaign)) {
       return { success: false, error: 'Unauthorized to view pledges for this specific campaign' };
   }

   const dSheet = getSheet('donations', CURRENT_SCHOOL_ID);
   const dHeaders = getHeaders(dSheet);
   const dRows = dSheet.getDataRange().getValues();
   
   const mSheet = getSheet('members', CURRENT_SCHOOL_ID);
   const mHeaders = getHeaders(mSheet);
   const mRows = mSheet.getDataRange().getValues();
   const membersInfo = {};
   for(let i=1; i<mRows.length; i++) { 
       let m = rowToObject(mRows[i], mHeaders); 
       membersInfo[m.id] = m; 
   }

   const pledges = [];
   for(let i=1; i<dRows.length; i++) {
      let r = rowToObject(dRows[i], dHeaders);
      if(r.campaign_id === campaign_id) {
         r.donor_name = membersInfo[r.donor_id] ? membersInfo[r.donor_id].name : 'Unknown Donor';
         pledges.push(r);
      }
   }
   return { success: true, data: pledges };
}

function isCampaignAdmin(user, campaign) {
   if(!campaign) return false;
   if(user.role === 'ICUNI Staff') return true;
   // If they are specifically marked as President or Finance Exec globally without a specific strict role
   const isExec = user.role.includes("Admin") || ["President", "Vice President", "Finance Executive"].includes(user.custom_title);
   
   if(user.role === 'School Administrator') return true;
   
   if(campaign.scope_type === 'yeargroup' && isExec && user.year_group_id === campaign.scope_id) return true;
   if(campaign.scope_type === 'club' && isExec && user.club_id === campaign.scope_id) return true;
   return false;
}

function handleApproveDonation(user, data) {`;

data = data.replace('function handleApproveDonation(user, data) {', newCode);

// Fix handleApproveDonation authorization
data = data.replace(
`   // Assuming Tier 4 (School Administrator) or Tier 5 (Staff) serves as the Finance Executive
   enforceRoleHierarchy(user, "School Administrator", [4, 5]);`,
`   // Wait for pledge query to find campaign, then we re-verify isCampaignAdmin`
);

// We need to fetch campaign_id for handleApproveDonation to check isCampaignAdmin!
// Let's replace the whole handleApproveDonation content

const newApproveLogic = `function handleApproveDonation(user, data) {
   const { pledge_id } = data;
   if (!pledge_id) return { success: false, error: "Missing pledge reference" };

   const dSheet = getSheet("donations", CURRENT_SCHOOL_ID);
   const dHeaders = getHeaders(dSheet);
   const dRows = dSheet.getDataRange().getValues();
   
   let targetPledge = null;
   let targetRowIndex = -1;
   
   for (let i = 1; i < dRows.length; i++) {
     let r = rowToObject(dRows[i], dHeaders);
     if (r.id === pledge_id) {
        if (r.status === "Approved") return { success: false, error: "Pledge is already verified" };
        targetPledge = r;
        targetRowIndex = i + 1;
        break;
     }
   }

   if (!targetPledge) return { success: false, error: "Pledge not found in ledger" };

   // Fetch the campaign to verify scope!
   const campSheet = getSheet("campaigns", CURRENT_SCHOOL_ID);
   const cHeaders = getHeaders(campSheet);
   const cRows = campSheet.getDataRange().getValues();
   let targetCampaign = null;
   let campaignRowIndex = -1;
   
   for (let j = 1; j < cRows.length; j++) {
     let c = rowToObject(cRows[j], cHeaders);
     if (c.id === targetPledge.campaign_id) {
        targetCampaign = c;
        campaignRowIndex = j + 1;
        break;
     }
   }
   
   if(!targetCampaign || !isCampaignAdmin(user, targetCampaign)) {
      return { success: false, error: "You are not authorized to approve pledges for this campaign scope." };
   }

   // Mark pledge as approved
   dSheet.getRange(targetRowIndex, dHeaders.indexOf("status") + 1).setValue("Approved");
   if (dHeaders.indexOf("approved_by") !== -1) {
       dSheet.getRange(targetRowIndex, dHeaders.indexOf("approved_by") + 1).setValue(user.id);
   }

   // Update campaign totals
   let nRaised = (parseFloat(targetCampaign.raised_amount) || 0) + parseFloat(targetPledge.amount);
   let nDonors = parseInt(targetCampaign.donor_count || 0) + 1;
   campSheet.getRange(campaignRowIndex, cHeaders.indexOf("raised_amount")+1).setValue(nRaised);
   campSheet.getRange(campaignRowIndex, cHeaders.indexOf("donor_count")+1).setValue(nDonors);
   
   return { success: true, message: "Pledge reconciled and funds authorized" };
}

function handleAdminAssignDonation(user, data) {
   const { campaign_id, donor_id, amount, is_anonymous } = data;
   if(!amount || isNaN(amount) || !campaign_id || !donor_id) return { success: false, error: "Missing required fields for direct assignment" };

   const campSheet = getSheet("campaigns", CURRENT_SCHOOL_ID);
   const cHeaders = getHeaders(campSheet);
   const cRows = campSheet.getDataRange().getValues();
   let targetCampaign = null;
   let campaignRowIndex = -1;
   
   for (let j = 1; j < cRows.length; j++) {
     let c = rowToObject(cRows[j], cHeaders);
     if (c.id === campaign_id) {
        targetCampaign = c;
        campaignRowIndex = j + 1;
        break;
     }
   }

   if(!targetCampaign || !isCampaignAdmin(user, targetCampaign)) {
      return { success: false, error: "You are not authorized to assign pledges to this campaign scope." };
   }

   const sheet = getSheet("donations", CURRENT_SCHOOL_ID);
   const headers = getHeaders(sheet);
   sheet.appendRow(headers.map(h => {
       if(h==="id") return Utilities.getUuid();
       if(h==="campaign_id") return campaign_id;
       if(h==="donor_id") return donor_id;
       if(h==="amount") return amount;
       if(h==="timestamp") return new Date().toISOString();
       if(h==="is_anonymous") return Boolean(is_anonymous);
       if(h==="status") return "Approved"; // Auto-approved because admin created it
       if(h==="approved_by") return user.id;
       return "";
   }));

   // Instantly update counter
   let nRaised = (parseFloat(targetCampaign.raised_amount) || 0) + parseFloat(amount);
   let nDonors = parseInt(targetCampaign.donor_count || 0) + 1;
   campSheet.getRange(campaignRowIndex, cHeaders.indexOf("raised_amount")+1).setValue(nRaised);
   campSheet.getRange(campaignRowIndex, cHeaders.indexOf("donor_count")+1).setValue(nDonors);
   
   return { success: true, message: "Authorized donation forced into ledger" };
}`;

const handleApproveDonationRegex = /function handleApproveDonation.*?function handleAdminAssignDonation.*?Authorized donation forced into ledger" ;\n}/s;

data = data.replace(handleApproveDonationRegex, newApproveLogic);

// Wait, I messed up the regex. It's safer to just replace everything from `function handleApproveDonation(user, data) {` down to `// Events`
const splitCode = data.split('// ==========================================');
const donationBlock = splitCode.find(c => c.includes('function handleDonation(user, data) {'));

fs.writeFileSync('patch5.js', 'console.log("Using ast parser to safely do this is better.");');
