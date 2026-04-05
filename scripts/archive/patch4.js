const fs = require('fs');
let data = fs.readFileSync('frontend/src/api/client.js', 'utf8');

const targetStr = 'adminCreateSchool: (schoolData) => apiRequest("adminCreateSchool", schoolData),';
const replacementStr = 'adminCreateSchool: (schoolData) => apiRequest("adminCreateSchool", schoolData),\n  adminProvisionMember: (data) => apiRequest("adminProvisionMember", data),\n  adminProvisionYearGroup: (data) => apiRequest("adminProvisionYearGroup", data),\n  adminProvisionClub: (data) => apiRequest("adminProvisionClub", data),';

data = data.replace(targetStr, replacementStr);
fs.writeFileSync('frontend/src/api/client.js', data);
console.log('Patch 4 applied for client.js successfully.');
