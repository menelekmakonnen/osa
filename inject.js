const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Cockpit.jsx', 'utf8');

// 1. Add state variables for impersonator
const stateInjection = `
  // Impersonator State
  const [schoolsList, setSchoolsList] = useState([]);
  const [activeImp, setActiveImp] = useState(null);
  const [impForm, setImpForm] = useState({ schoolId: '', role: 'School Administrator' });
`;
code = code.replace(/(const \[savingFlags, setSavingFlags\] = useState\(false\);)/, '$1\n' + stateInjection);

// 2. Add handleEngage before loadOverview
const engageFunc = `
  const handleEngage = () => {
      if (!impForm.schoolId) { toast.error('Select a target tenant database.'); return; }
      toast.loading('Engaging Impersonation Context...');
      api.setImpersonation(impForm.schoolId, impForm.role);
  };
`;
code = code.replace(/(const loadOverview = useCallback\(async \(\) => \{)/, engageFunc + '\n  $1');

// 3. Sync schools and activeImp inside loadOverview
const initSync = `
      const imp = api.getImpersonation();
      setActiveImp(imp);
      const res = await api.getSchools();
      setSchoolsList(res.data || []);
`;
code = code.replace(/(setStaffRoster\(roster \|\| \[\]\);)/, '$1\n' + initSync);

// 4. Insert Context Simulator UI inside Overview tab
const simulatorUI = `
            {/* Context Simulator Module */}
            <Card className="p-8 border-2 border-brand-200 shadow-md mb-6">
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 text-brand-900">
                            <Monitor className="text-brand-600" size={24} />
                            Context Simulator
                        </h3>
                        <p className="text-brand-700/80 text-sm mt-1">Route all API transactions through an isolated school tenant mimicking standard clearance.</p>
                    </div>
                    {activeImp && <Badge colorHex="#dcfce7" textHex="#16a34a" className="animate-pulse shadow-sm font-bold border border-green-200 uppercase">Engaged</Badge>}
                </div>

                {activeImp ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <h4 className="text-green-800 font-bold mb-2 tracking-wide uppercase text-xs">Active Routing Node</h4>
                        <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                            <div>
                                <p className="text-lg font-black text-slate-900">{schoolsList.find(s => s.id === activeImp.target_school_id)?.name || activeImp.target_school_id}</p>
                                <p className="text-slate-500 flex items-center gap-2 text-sm mt-1">
                                    <Shield size={14} className="text-amber-500" />
                                    Simulating clearance: <span className="font-semibold text-slate-800">{activeImp.simulate_role}</span>
                                </p>
                            </div>
                            <Button onClick={() => api.clearImpersonation()} variant="ghost" className="text-red-600 hover:bg-red-50 font-bold">
                                Disengage
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Select 
                            label="1. Target Organization / School"
                            value={impForm.schoolId}
                            onChange={(e) => setImpForm(p => ({...p, schoolId: e.target.value}))}
                            options={[
                                {label: 'Select Database Namespace...', value: ''},
                                ...schoolsList.map(s => ({label: Math.max(0, s.name.length) ? s.name + ' (' + s.short_code + ')' : s.name, value: s.id}))
                            ]}
                        />
                        <Select 
                            label="2. Privilege Class"
                            value={impForm.role}
                            onChange={(e) => setImpForm(p => ({...p, role: e.target.value}))}
                            options={[
                                {label: 'Member (Read-Only Layouts)', value: 'Member'},
                                {label: 'Year Group Admin', value: 'Year Group Admin'},
                                {label: 'School Administrator', value: 'School Administrator'},
                                {label: 'Super Admin', value: 'Super Admin'}
                            ]}
                        />
                        <Button 
                            onClick={handleEngage}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 text-lg shadow-xl shadow-slate-900/20"
                        >
                            ENGAGE SIMULATION
                        </Button>
                    </div>
                )}
            </Card>
`;

code = code.replace(/(\{.*? KPI Strip .*?\})/, simulatorUI + '\n            $1');
fs.writeFileSync('frontend/src/pages/Cockpit.jsx', code);
console.log('Successfully injected Impersonator.');
