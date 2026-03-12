import React from 'react';
import { Card, Button, Badge } from '../components/ui';
import { authState } from '../api/client';
import { ShieldAlert, Database, Users, Settings, Activity } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export function SuperAdmin() {
  const user = authState.getUser();
  const isSuperAdmin = user?.role === "Super Admin" || user?.role === "IT Department";

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
             <Button size="sm" className="bg-ink-title text-white hover:bg-black font-bold border-none shadow-sm flex-1">Add New School</Button>
             <Button size="sm" variant="ghost" className="font-bold text-ink-muted hover:text-ink-title px-2">View Licenses</Button>
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
             <Button size="sm" variant="secondary" className="flex-1 font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title">Manage Executives</Button>
             <Button size="sm" variant="ghost" className="font-bold text-ink-muted hover:text-ink-title px-2">IT Department</Button>
           </div>
        </Card>

        {/* Platform Config */}
        <Card className="flex flex-col gap-4 border-amber-200 shadow-social-card hover:border-amber-400 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold flex items-center gap-2 text-ink-title m-0"><Settings className="text-ink-muted" size={22} strokeWidth={2.5}/> Feature Flags</h2>
           </div>
           <div className="flex flex-col gap-2 text-[14px] flex-1">
             <FeatureToggle label="Fundraising Module" enabled={true} />
             <FeatureToggle label="Newsletters Module" enabled={true} />
             <FeatureToggle label="Cross-School Events" enabled={true} />
             <FeatureToggle label="Payment Gateway (v2)" enabled={false} />
             <FeatureToggle label="Admin Approval for Registrations" enabled={false} />
           </div>
        </Card>

        {/* Analytics */}
        <Card className="flex flex-col gap-4 border-amber-200 shadow-social-card hover:border-amber-400 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold flex items-center gap-2 text-ink-title m-0"><Activity className="text-blue-500" size={22} strokeWidth={2.5}/> Global Analytics</h2>
           </div>
           <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="bg-surface-muted p-4 rounded-[12px] border border-border-light flex flex-col items-center justify-center shadow-sm">
                 <span className="text-[28px] font-bold text-brand-600 leading-none">1,402</span>
                 <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mt-2 text-center">Total Members</span>
              </div>
              <div className="bg-surface-muted p-4 rounded-[12px] border border-border-light flex flex-col items-center justify-center shadow-sm">
                 <span className="text-[28px] font-bold text-red-500 leading-none">12k</span>
                 <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mt-2 text-center">Total Pledged (GHS)</span>
              </div>
           </div>
           <div className="flex justify-center mt-auto pt-2">
               <Button size="sm" variant="secondary" className="w-full font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title">Export Platform Report</Button>
           </div>
        </Card>

      </div>
    
      {/* ICUNI Footer */}
      <div className="mt-8 text-center text-sm text-muted">
         OSA Super Admin Interface restricted to authorised <strong>ICUNI Labs</strong> personnel only.
      </div>
    </div>
  );
}

function FeatureToggle({ label, enabled }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted border border-border-light hover:border-brand-300 transition-colors">
       <span className="font-bold text-[14px] text-ink-title">{label}</span>
       <div className={`w-11 h-6 rounded-pill relative transition-colors shadow-inner ${enabled ? 'bg-brand-500' : 'bg-[#E4E6EB]'}`}>
          <div className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${enabled ? 'right-[2px]' : 'left-[2px]'}`} />
       </div>
    </div>
  );
}
