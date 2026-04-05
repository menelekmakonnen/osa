const fs = require('fs');

let data = fs.readFileSync('frontend/src/pages/Cockpit.jsx', 'utf8');

const provisionTabJSX = `
        {/* ============ PROVISIONING TAB ============ */}
        {activeTab === 'provision' && (
          <div className="flex flex-col gap-6">
            <Card className="p-8 border-2 border-brand-200 shadow-md">
                <div className="mb-6 border-b border-brand-200 pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-brand-900">
                        <Zap className="text-brand-600" size={24} />
                        Entity Provisioning Hub
                    </h3>
                    <p className="text-brand-700/80 text-sm mt-1">Directly inject objects into target tenant schemas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {/* Member Provision */}
                   <div className="space-y-4 bg-surface-muted p-4 rounded-xl border border-border-light shadow-sm">
                      <h4 className="font-bold text-ink-title flex items-center gap-2 border-b border-border-light pb-2"><UserPlus size={16}/> Forge Member</h4>
                      <Select label="Target DB Node" value={provMember.target_school_id} onChange={e=>setProvMember(p=>({...p, target_school_id: e.target.value}))} options={[{label:'Select...', value:''}, ...schoolsList.map(s=>({label:s.name, value:s.id}))]} />
                      <Input label="Full Name" value={provMember.name} onChange={e=>setProvMember(p=>({...p, name: e.target.value}))} />
                      <Input label="Email Address" type="email" value={provMember.email} onChange={e=>setProvMember(p=>({...p, email: e.target.value}))} />
                      <Input label="Temp Password" type="password" value={provMember.password} onChange={e=>setProvMember(p=>({...p, password: e.target.value}))} />
                      <Select label="Force Tier Role" value={provMember.role} onChange={e=>setProvMember(p=>({...p, role: e.target.value}))} options={[{label:'Member', value:'Member'}, {label:'Year Group Admin', value:'Year Group Admin'}, {label:'School Administrator', value:'School Administrator'}]} />
                      <Button onClick={async () => {
                         if(!provMember.target_school_id || !provMember.email) return toast.error("Missing fields");
                         setProvisioning(true);
                         try { await api.adminProvisionMember(provMember); toast.success("Member Provisioned!"); setProvMember(p=>({...p, email:'', name:'', password:''})); }
                         catch(err) { toast.error(err.message); } finally { setProvisioning(false); }
                      }} disabled={provisioning} className="w-full">Inject Profile</Button>
                   </div>

                   {/* Year Group Provision */}
                   <div className="space-y-4 bg-surface-muted p-4 rounded-xl border border-border-light shadow-sm">
                      <h4 className="font-bold text-ink-title flex items-center gap-2 border-b border-border-light pb-2"><Calendar size={16}/> Forge Year Group</h4>
                      <Select label="Target DB Node" value={provYG.target_school_id} onChange={e=>setProvYG(p=>({...p, target_school_id: e.target.value}))} options={[{label:'Select...', value:''}, ...schoolsList.map(s=>({label:s.name, value:s.id}))]} />
                      <Input label="Year (e.g. 1999)" type="number" value={provYG.year} onChange={e=>setProvYG(p=>({...p, year: e.target.value}))} />
                      <Input label="Nickname (Optional)" value={provYG.nickname} onChange={e=>setProvYG(p=>({...p, nickname: e.target.value}))} />
                      <Button onClick={async () => {
                         if(!provYG.target_school_id || !provYG.year) return toast.error("Missing fields");
                         setProvisioning(true);
                         try { await api.adminProvisionYearGroup(provYG); toast.success("Year Group Created!"); setProvYG(p=>({...p, year:'', nickname:''})); }
                         catch(err) { toast.error(err.message); } finally { setProvisioning(false); }
                      }} disabled={provisioning} className="w-full mt-auto">Inject Cohort</Button>
                   </div>

                   {/* Club Provision */}
                   <div className="space-y-4 bg-surface-muted p-4 rounded-xl border border-border-light shadow-sm">
                      <h4 className="font-bold text-ink-title flex items-center gap-2 border-b border-border-light pb-2"><Shield size={16}/> Forge Club / Chapter</h4>
                      <Select label="Target DB Node" value={provClub.target_school_id} onChange={e=>setProvClub(p=>({...p, target_school_id: e.target.value}))} options={[{label:'Select...', value:''}, ...schoolsList.map(s=>({label:s.name, value:s.id}))]} />
                      <Input label="Club Name" value={provClub.group_name} onChange={e=>setProvClub(p=>({...p, group_name: e.target.value}))} />
                      <Select label="Group Type" value={provClub.group_type} onChange={e=>setProvClub(p=>({...p, group_type: e.target.value}))} options={[{label:'Club', value:'club'}, {label:'House', value:'house'}, {label:'City Chapter', value:'chapter'}]} />
                      <Input label="Description" value={provClub.description} onChange={e=>setProvClub(p=>({...p, description: e.target.value}))} />
                      <Button onClick={async () => {
                         if(!provClub.target_school_id || !provClub.group_name) return toast.error("Missing fields");
                         setProvisioning(true);
                         try { await api.adminProvisionClub(provClub); toast.success("Group Initialized!"); setProvClub(p=>({...p, group_name:'', description:''})); }
                         catch(err) { toast.error(err.message); } finally { setProvisioning(false); }
                      }} disabled={provisioning} className="w-full">Inject Structure</Button>
                   </div>
                </div>
            </Card>
          </div>
        )}

        {/* ============ SCHOOLS TAB ============ */}`;

data = data.replace('{/* ============ SCHOOLS TAB ============ */}', provisionTabJSX);
data = data.replace('export function Cockpit() {', 'import { Calendar } from "lucide-react";\nexport function Cockpit() {');
fs.writeFileSync('frontend/src/pages/Cockpit.jsx', data);
console.log('Patch 2 applied successfully.');
