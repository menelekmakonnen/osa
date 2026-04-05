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
  if (!result.success) throw new Error(result.error || "Unknown error");
  return result.data;
}

async function run() {
  try {
    console.log("Logging in as Staff...");
    const authData = await apiRequest("login", { email: "hello@menelekmakonnen.com", password: "n**Jb3kn)s)PO@I!OZW!)l8M" });
    const token = authData.token;
    
    console.log("Fetching schools...");
    const schoolsData = await apiRequest("getSchools", {}, token);
    const schools = schoolsData || [];
    console.log("Schools list:", schools.map(s => s.name));
    
    let iptac = schools.find(s => s.name && s.name.toLowerCase().includes("penetration"));
    
    if (!iptac) {
      console.log("Target school not found! Creating it manually now...");
      
      const adminUsername = "test.admin";
      await apiRequest("adminCreateSchool", {
        name: "Test Admin",
        username: adminUsername,
        email: "pt_t4@icuni.org",
        password: "TestPass123!",
        new_school_name: "ICUNI Penetration Test Academy",
        new_school_type: "Mixed",
        new_school_admin_id: adminUsername, // Cockpit expects this payload from Cockpit.jsx
        new_school_motto: "Testing everything",
        new_school_colours: ["#000000", "#ffffff"],
        new_school_cheque_representation: "N/A",
        new_school_classes: ["2023", "2024"],
        new_school_houses: ["Red", "Blue"]
      }, token).catch(e => {
        return apiRequest("onboardSchool", { // try fallback
            name: "Test Admin",
            username: adminUsername,
            email: "pt_t4@icuni.org",
            password: "TestPass123!",
            new_school_name: "ICUNI Penetration Test Academy",
            new_school_type: "Mixed",
            new_school_admin_id: adminUsername,
            new_school_motto: "Testing everything",
            new_school_colours: [],
            new_school_cheque_representation: "N/A",
            new_school_classes: [],
            new_school_houses: []
        }, token);
      });
      
      console.log("School creation requested! Re-fetching schools...");
      const newSchoolsData = await apiRequest("getSchools", {}, token);
      iptac = (newSchoolsData || []).find(s => s.name && s.name.toLowerCase().includes("penetration"));
      if (!iptac) {
        console.log("Still not found! Failsafe abort.");
        return;
      }
    }
    
    console.log("Found Target School ID:", iptac.id);

    const members = [
      { email: "pt_t0@icuni.org", name: "Standard Test", role: "Member", password: "TestPass123!" },
      { email: "pt_t1@icuni.org", name: "GroupAdmin Test", role: "Year Group Admin", password: "TestPass123!" },
      { email: "pt_t4@icuni.org", name: "SchoolAdmin Test", role: "School Administrator", password: "TestPass123!" }
    ];

    for (let m of members) {
      console.log("Provisioning", m.email, "...");
      try {
        const res = await apiRequest("adminProvisionMember", {
          target_school_id: iptac.id,
          name: m.name,
          email: m.email,
          role: m.role,
          password: m.password,
          year_group_id: ""
        }, token);
        console.log("Success:", m.email);
      } catch (err) {
        console.log("Failed to provision", m.email, "Error:", err.message);
      }
    }
    
    console.log("Done.");
  } catch (e) {
    console.error("Fatal Error:", e);
  }
}
run();
