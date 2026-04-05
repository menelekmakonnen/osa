const GAS_URL = "https://script.google.com/macros/s/AKfycby88ZH_HMNAczLJwROj83yQ2jcEL7MURR9hlrKkTXc2KHRQpQnppZyY2Amq_IHKGAHp/exec";

async function apiRequest(action, data = {}, token = null) {
  const payload = { action, data, token };
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const result = await res.json();
  if (!result.success) throw new Error(result.error || "Unknown error inside API");
  return result.data;
}

async function runPhase3() {
  try {
    console.log("--- PHASE 3 API EXPLOIT SUITE ---");
    console.log("1. Authenticating as Global Staff...");
    const authData = await apiRequest("login", { email: "hello@menelekmakonnen.com", password: "n**Jb3kn)s)PO@I!OZW!)l8M" });
    const staffToken = authData.token;
    
    console.log("2. Fetching/Provisioning Sandbox Tenant...");
    const schoolsData = await apiRequest("getSchools", {}, staffToken);
    let iptac = (schoolsData || []).find(s => s.name && s.name.toLowerCase().includes("penetration"));
    
    if (!iptac) {
      console.log("Recreating Sandbox School...");
      await apiRequest("adminCreateSchool", {
        new_school_name: "ICUNI Penetration Test Academy",
        new_school_type: "Mixed",
        new_school_admin_id: "test.admin"
      }, staffToken);
      
      const refreshSchools = await apiRequest("getSchools", {}, staffToken);
      iptac = (refreshSchools || []).find(s => s.name && s.name.toLowerCase().includes("penetration"));
    }
    
    const targetId = iptac.id;
    console.log("Sandbox Tenant Locked:", targetId);

    console.log("3. Injecting T4 Malicious Actor...");
    try {
      await apiRequest("adminProvisionMember", {
        target_school_id: targetId,
        name: "T4 Admin",
        email: "malicious_t4@icuni.org",
        role: "School Administrator",
        password: "HackPass123!",
        year_group_id: "ADMIN"
      }, staffToken);
    } catch(e) { console.log("Account likely exists."); }

    console.log("4. Authenticating as Malicious T4...");
    const t4Auth = await apiRequest("login", { email: "malicious_t4@icuni.org", password: "HackPass123!" });
    const t4Token = t4Auth.token;

    console.log("\n--- EXECUTING EXPLOITS ---");

    // Exploiting Group Board (XSS Payload)
    console.log("Testing Group Board XSS...");
    try {
      let boardRes = await apiRequest("postBoardMessage", {
          group_id: "ADMIN",
          content: "<script>alert('XSS_Test')</script><img src='x' onerror='alert(\"XSS\")'/>",
          scope_type: "yeargroup",
          scope_id: "ADMIN"
      }, t4Token);
      console.log(" => VULNERABLE: Group board accepted raw XSS payload. ID:", boardRes.id);
    } catch(e) { console.log(" => SECURE: Group board rejected payload.", e.message); }

    // Exploiting Fundraising (Negative Campaign)
    console.log("\nTesting Fundraising Validation Bypass...");
    try {
      let campRes = await apiRequest("createCampaign", {
          title: "Bypass Test Campaign",
          description: "Testing negative values",
          target_amount: -50000, // Malicious negative amount
          scope_type: "school",
          scope_id: "all"
      }, t4Token);
      console.log(" => VULNERABLE: Created negative target campaign.");
    } catch(e) { console.log(" => SECURE or Different Error:", e.message); }

    // Exploiting Events (Past Dates & XSS)
    console.log("\nTesting Events Field Manipulation...");
    try {
      let eventRes = await apiRequest("createEvent", {
          title: "Past Hack Event",
          description: "Testing past event",
          start_date: "1999-01-01T00:00:00.000Z",
          end_date: "1999-01-02T00:00:00.000Z",
          location: "XSS <script>alert(1)</script>",
          scope_type: "school",
          scope_id: "all"
      }, t4Token);
      console.log(" => VULNERABLE: Event created in the past with XSS.");
    } catch(e) { console.log(" => SECURE or Different Error:", e.message); }

    // Exploiting Newsletters (Forced Dispatch)
    console.log("\nTesting Newsletter State Bypass...");
    try {
      let nlRes = await apiRequest("dispatchNewsletter", {}, t4Token);
      console.log(" => VULNERABLE: Newsletter dispatched despite zero approved posts.", nlRes);
    } catch(e) { console.log(" => SECURE: Newsletter rejected dispatch.", e.message); }

    console.log("\n--- SUITE COMPLETE ---");
  } catch(e) {
    console.error("Critical Execution Error:", e);
  }
}

runPhase3();
