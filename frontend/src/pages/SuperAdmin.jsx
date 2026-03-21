import React from 'react';
import { Card, Button, Badge, Modal, Input } from '../components/ui';
import { authState, api } from '../api/client';
import { ShieldAlert, Database, Users, Settings, Activity } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export function SuperAdmin() {
  const user = authState.getUser();
  const isSuperAdmin = user?.role === "Super Admin" || user?.role === "IT Department" || user?.role?.includes("School Administrator");

  const [isAddSchoolOpen, setIsAddSchoolOpen] = React.useState(false);
  const [newSchoolData, setNewSchoolData] = React.useState({ school_name: '', admin_name: '', admin_email: '' });
  const [submittingSchool, setSubmittingSchool] = React.useState(false);
  const [features, setFeatures] = React.useState({ fundraising: true, newsletters: true });

  const handleAddSchool = async (e) => {
     e.preventDefault();
     setSubmittingSchool(true);
     try {
        await api.onboardSchool({
            school_name: newSchoolData.school_name,
            admin_name: newSchoolData.admin_name,
            admin_email: newSchoolData.admin_email,
            admin_password: "TempPassword123!"
        });
        alert("School registered successfully and automatically APPROVED for Phase 11 Audit workflows.");
        setIsAddSchoolOpen(false);
     } catch(err) {
        alert("Error: " + err.message);
     } finally {
        setSubmittingSchool(false);
     }
  };

  if (!isSuperAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[800px] mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-bold text-amber-600 m-0 flex items-center gap-3">
           <ShieldAlert className="text-amber-500" size={28} strokeWidth={2.5}/> Super Admin Control
        </h1>
        <p className="text-[14px] text-ink-muted">ICUNI Labs platform governance and multi-school management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Schools Management */}
        <Card className="flex flex-col gap-4 border-amber-200 shadow-social-card hover:border-amber-400 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold flex items-center gap-2 text-ink-title m-0"><Database className="text-brand-500" size={22} strokeWidth={2.5}/> Schools Registry</h2>
              <Badge colorHex="#dcfce7" textHex="#16a34a" className="font-bold border border-green-200">1 Active</Badge>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Manage onboarded schools, update Google Apps Script endpoints, configure branding colors, and manage associations.
           </p>
           <div className="flex justify-between items-center mt-auto pt-2 gap-2">
             <Button size="sm" className="bg-ink-title text-white hover:bg-black font-bold border-none shadow-sm flex-1" onClick={() => setIsAddSchoolOpen(true)}>Add New School</Button>
             <Button size="sm" variant="ghost" className="font-bold text-ink-muted hover:text-ink-title px-2" onClick={() => window.location.href='/app/admin'}>View Licenses</Button>
           </div>
        </Card>

        {/* Global Governance */}
        <Card className="flex flex-col gap-4 border-amber-200 shadow-social-card hover:border-amber-400 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold flex items-center gap-2 text-ink-title m-0"><Users className="text-amber-500" size={22} strokeWidth={2.5}/> Platform Governance</h2>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Assign Platform Executive roles. Manage the IT Department roster. Edit or override fixed member identities across any school.
           </p>
           <div className="flex justify-between items-center mt-auto pt-2 gap-2">
             <Button size="sm" variant="secondary" className="flex-1 font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title" onClick={() => window.location.href='/app/members'}>Manage Executives</Button>
             <Button size="sm" variant="ghost" className="font-bold text-ink-muted hover:text-ink-title px-2" onClick={() => window.location.href='/app/members'}>IT Department</Button>
           </div>
        </Card>

        {/* Platform Config */}
        <Card className="flex flex-col gap-4 border-amber-200 shadow-social-card hover:border-amber-400 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold flex items-center gap-2 text-ink-title m-0"><Settings className="text-ink-muted" size={22} strokeWidth={2.5}/> Feature Flags</h2>
           </div>
           <div className="flex flex-col gap-2 text-[14px] flex-1">
             <FeatureToggle label="Fundraising Module" enabled={features.fundraising} onClick={() => setFeatures({...features, fundraising: !features.fundraising})} />
             <FeatureToggle label="Newsletters Module" enabled={features.newsletters} onClick={() => setFeatures({...features, newsletters: !features.newsletters})} />
             <FeatureToggle label="Cross-School Events" enabled={true} />
             <FeatureToggle label="Payment Gateway (v2)" enabled={false} />
             <FeatureToggle label="Admin Approval for Registrations" enabled={false} />
           </div>
        </Card>

        {/* Accountability Tracker (New Phase 2 UI Blueprint) */}
        <Card className="flex flex-col gap-4 border-amber-200 shadow-social-card hover:border-amber-400 transition-colors md:col-span-2">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div className="flex flex-col">
                 <h2 className="text-[18px] font-bold flex items-center gap-2 text-ink-title m-0"><Activity className="text-amber-500" size={22} strokeWidth={2.5}/> Super Admin Accountability Tracker</h2>
                 <span className="text-[12px] text-ink-muted">Live 8-metric weekly algorithmic tracking</span>
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                 <thead>
                    <tr className="border-b border-border-light text-ink-muted text-[11px] uppercase tracking-wider">
                       <th className="font-bold py-2 px-2">Administrator</th>
                       <th className="font-bold py-2 px-2">Tier Level</th>
                       <th className="font-bold py-2 px-2">8-Metric Activity</th>
                       <th className="font-bold py-2 px-2">Weekly Score</th>
                       <th className="font-bold py-2 px-2 text-right">Status</th>
                    </tr>
                 </thead>
                 <tbody className="text-ink-body">
                    {/* Mock Data Node 1 */}
                    <tr className="border-b border-border-light hover:bg-surface-hover transition-colors">
                       <td className="py-3 px-2 font-bold text-ink-title flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs">M</div>
                          Mikael Gabriel
                       </td>
                       <td className="py-3 px-2">Platform</td>
                       <td className="py-3 px-2">
                          <div className="flex gap-1">
                             <div title="Logins: High" className="w-2 h-4 bg-green-500 rounded-sm"></div>
                             <div title="Posts Reviewed: Moderate" className="w-2 h-4 bg-amber-400 rounded-sm"></div>
                             <div title="Tickets Resolved: Low" className="w-2 h-4 bg-red-400 rounded-sm"></div>
                             <div title="Petitions Handled: High" className="w-2 h-4 bg-green-500 rounded-sm"></div>
                             <div title="Roles Assigned: None" className="w-2 h-4 bg-surface-muted border border-border-light rounded-sm"></div>
                             <div className="w-2 h-4 bg-green-500 rounded-sm"></div>
                             <div className="w-2 h-4 bg-amber-400 rounded-sm"></div>
                             <div className="w-2 h-4 bg-green-500 rounded-sm"></div>
                          </div>
                       </td>
                       <td className="py-3 px-2 font-black text-ink-title">84<span className="text-[10px] text-ink-muted font-bold">/100</span></td>
                       <td className="py-3 px-2 text-right">
                          <Badge colorHex="#dcfce7" textHex="#16a34a" className="font-bold border border-green-200 uppercase tracking-widest text-[10px]">Active</Badge>
                       </td>
                    </tr>
                    {/* Mock Data Node 2 */}
                    <tr className="border-b border-border-light hover:bg-surface-hover transition-colors">
                       <td className="py-3 px-2 font-bold text-ink-title flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">A</div>
                          Awurama Adjei
                       </td>
                       <td className="py-3 px-2">Class</td>
                       <td className="py-3 px-2">
                          <div className="flex gap-1">
                             <div className="w-2 h-4 bg-amber-400 rounded-sm"></div>
                             <div className="w-2 h-4 bg-surface-muted border border-border-light rounded-sm"></div>
                             <div className="w-2 h-4 bg-red-400 rounded-sm"></div>
                             <div className="w-2 h-4 bg-surface-muted border border-border-light rounded-sm"></div>
                             <div className="w-2 h-4 bg-surface-muted border border-border-light rounded-sm"></div>
                             <div className="w-2 h-4 bg-surface-muted border border-border-light rounded-sm"></div>
                             <div className="w-2 h-4 bg-surface-muted border border-border-light rounded-sm"></div>
                             <div className="w-2 h-4 bg-amber-400 rounded-sm"></div>
                          </div>
                       </td>
                       <td className="py-3 px-2 font-black text-ink-title">22<span className="text-[10px] text-ink-muted font-bold">/100</span></td>
                       <td className="py-3 px-2 text-right">
                          <Badge colorHex="#fee2e2" textHex="#dc2626" className="font-bold border border-red-200 uppercase tracking-widest text-[10px]">Failing</Badge>
                       </td>
                    </tr>
                 </tbody>
              </table>
           </div>
           
           <div className="mt-2 text-[12px] text-ink-body bg-amber-50 rounded-lg p-3 border border-amber-200">
              <strong>Structured Replacement Protocol:</strong> Admins holding a status of <Badge colorHex="#fee2e2" textHex="#dc2626" className="inline-block px-1.5 py-0 border-red-200 mx-1">Failing</Badge> for 3 consecutive weeks automatically trigger a community replacement vote.
           </div>
        </Card>

        {/* Petitions Engine */}
        <Card className="flex flex-col gap-4 border-amber-200 shadow-social-card hover:border-amber-400 transition-colors md:col-span-2">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold flex items-center gap-2 text-ink-title m-0"><Users className="text-amber-500" size={22} strokeWidth={2.5}/> Active Community Petitions</h2>
              <Badge colorHex="#dcfce7" textHex="#16a34a" className="font-bold border border-green-200">System Healthy</Badge>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Track major community grievances. A petition reaching the 10% member threshold binds the appointing Super Admin to an obligatory 7-day response SLA.
           </p>
           
           <div className="flex flex-col gap-3 mt-2">
              <div className="bg-surface-default border border-border-light rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <div className="flex flex-col gap-1">
                    <span className="font-bold text-[15px] text-ink-title text-red-600">Investigate the Organiser's Budget allocation</span>
                    <span className="text-[12px] text-ink-muted">Filed against: Year Group Organiser • 14 days ago</span>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                       <span className="text-[12px] font-bold text-ink-title">12% / 10% Threshold Met</span>
                       <div className="w-32 h-2 bg-surface-muted rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-red-500 w-[100%]"></div>
                       </div>
                    </div>
                    <Badge colorHex="#fee2e2" textHex="#dc2626" className="font-bold border border-red-200 uppercase tracking-widest text-[10px]">Overdue By 7 Days</Badge>
                 </div>
              </div>
           </div>

           <div className="flex justify-start items-center mt-2 pt-2 gap-2 border-t border-border-light">
             <Button size="sm" variant="secondary" className="font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title" onClick={() => window.location.href='/app/support'}>Review All Petitions</Button>
           </div>
        </Card>

      </div>
    
      {/* ICUNI Footer */}
      <div className="mt-8 text-center text-sm text-ink-muted">
         OSA Super Admin Interface restricted to authorised <strong>ICUNI Labs</strong> personnel only.
      </div>

       <Modal isOpen={isAddSchoolOpen} onClose={() => setIsAddSchoolOpen(false)} title="Onboard New School">
         <form onSubmit={handleAddSchool} className="flex flex-col gap-4 mt-2">
            <div className="p-3 bg-green-50 text-green-800 rounded text-[13px] mb-2 border border-green-200">
               <strong>Audit Phase 11:</strong> Schools onboarded here are automatically granted 'Approved' status to bypass manual ICUNI Labs review workflows.
            </div>
            <Input 
               label="School Name" 
               required 
               value={newSchoolData.school_name}
               onChange={e => setNewSchoolData({...newSchoolData, school_name: e.target.value})}
            />
            <Input 
               label="Old Students Full Name" 
               placeholder="e.g. Aggrey Memorial Old Students Association"
               required 
               value={newSchoolData.old_students_full_name || ''}
               onChange={e => setNewSchoolData({...newSchoolData, old_students_full_name: e.target.value})}
            />
            <Input 
               label="Old Students Short Name" 
               placeholder="e.g. AMOSA"
               required 
               value={newSchoolData.old_students_short_name || ''}
               onChange={e => setNewSchoolData({...newSchoolData, old_students_short_name: e.target.value})}
            />
            <Input 
               label="Initial Admin Name" 
               required 
               value={newSchoolData.admin_name}
               onChange={e => setNewSchoolData({...newSchoolData, admin_name: e.target.value})}
            />
            <Input 
               label="Initial Admin Email" 
               type="email"
               required 
               value={newSchoolData.admin_email}
               onChange={e => setNewSchoolData({...newSchoolData, admin_email: e.target.value})}
            />
            <div className="flex justify-end gap-2 mt-2">
               <Button variant="ghost" type="button" onClick={() => setIsAddSchoolOpen(false)}>Cancel</Button>
               <Button type="submit" disabled={submittingSchool}>{submittingSchool ? 'Registering...' : 'Register School'}</Button>
            </div>
         </form>
       </Modal>
    </div>
  );
}

function FeatureToggle({ label, enabled, onClick }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted border border-border-light hover:border-brand-300 transition-colors cursor-pointer" onClick={onClick}>
       <span className="font-bold text-[14px] text-ink-title">{label}</span>
       <div className={`w-11 h-6 rounded-pill relative transition-colors shadow-inner ${enabled ? 'bg-brand-500' : 'bg-[#E4E6EB]'}`}>
          <div className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${enabled ? 'right-[2px]' : 'left-[2px]'}`} />
       </div>
    </div>
  );
}
