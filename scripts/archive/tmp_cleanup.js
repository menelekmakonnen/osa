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
    const iptac = (schoolsData || []).find(s => s.name === "ICUNI Penetration Test Academy" || s.name === "IPTAC");
    
    if (iptac) {
      console.log("Found school ID:", iptac.id);
      console.log("Wiping sandbox tenant...");
      await apiRequest("removeSchool", { schoolId: iptac.id }, token);
      console.log("Wipe completed successfully.");
    } else {
      console.log("Target school not found, might already be wiped!");
    }
  } catch (e) {
    console.error("Fatal Error:", e);
  }
}
run();
