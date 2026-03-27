const fs = require('fs');

let data = fs.readFileSync('frontend/src/pages/Cockpit.jsx', 'utf8');

// 1. Add Zap icon
data = data.replace('CheckCircle, Download', 'CheckCircle, Download, Zap');

// 2. Update newSchoolData state and add Provisioning State
data = data.replace(
  "const [newSchoolData, setNewSchoolData] = useState({ school_name: '', admin_name: '', admin_email: '', school_type: 'Mixed' });",
  `const [newSchoolData, setNewSchoolData] = useState({ school_name: '', admin_name: '', admin_email: '', school_type: 'Mixed', association_name: '', association_short_name: '', motto: '', cheque_representation: 'N/A', classes: '', houses: '' });
  const [provMember, setProvMember] = useState({ target_school_id: '', name: '', email: '', role: 'Member', year_group_id: '', password: '' });
  const [provYG, setProvYG] = useState({ target_school_id: '', year: '', nickname: '' });
  const [provClub, setProvClub] = useState({ target_school_id: '', group_name: '', group_type: 'club', description: '' });
  const [provisioning, setProvisioning] = useState(false);`
);

// 3. Update handleAddSchool to send all fields
data = data.replace(
`      await api.onboardSchool({
        name: newSchoolData.admin_name,
        username: adminUsername,
        email: newSchoolData.admin_email,
        password: "TempPassword123!",
        new_school_name: newSchoolData.school_name,
        new_school_type: newSchoolData.school_type,
        new_school_admin_id: adminUsername,
        new_school_motto: "",
        new_school_colours: [],
        new_school_cheque_representation: "N/A",
        new_school_classes: [],
        new_school_houses: []
      });`,
`      await api.onboardSchool({
        name: newSchoolData.admin_name,
        username: adminUsername,
        email: newSchoolData.admin_email,
        password: "TempPassword123!",
        new_school_name: newSchoolData.school_name,
        new_school_type: newSchoolData.school_type,
        new_school_admin_id: adminUsername,
        new_association_name: newSchoolData.association_name,
        new_association_short_name: newSchoolData.association_short_name,
        new_school_motto: newSchoolData.motto,
        new_school_colours: [],
        new_school_cheque_representation: newSchoolData.cheque_representation,
        new_school_classes: newSchoolData.classes.split(',').map(s=>s.trim()).filter(Boolean),
        new_school_houses: newSchoolData.houses.split(',').map(s=>s.trim()).filter(Boolean)
      });`
);

// 4. Update the final reset of newSchoolData in handleAddSchool
data = data.replace(
`setNewSchoolData({ school_name: '', admin_name: '', admin_email: '', school_type: 'Mixed' });`,
`setNewSchoolData({ school_name: '', admin_name: '', admin_email: '', school_type: 'Mixed', association_name: '', association_short_name: '', motto: '', cheque_representation: 'N/A', classes: '', houses: '' });`
);

// 5. Add provision tab definition
data = data.replace(
`{ id: 'flags', icon: Settings, label: 'Feature Flags' },`,
`{ id: 'provision', icon: Zap, label: 'Provision API' },
          { id: 'flags', icon: Settings, label: 'Feature Flags' },`
);

fs.writeFileSync('frontend/src/pages/Cockpit.jsx', data);
console.log('Patch applied successfully.');
