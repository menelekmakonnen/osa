import React from 'react';
import { Card, Button, Badge } from '../components/ui';
import { authState } from '../api/client';
import { Shield, Mail, Heart, Calendar } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export function Admin() {
  const user = authState.getUser();
  const isExec = user?.role?.includes("Admin") || user?.role?.includes("President");

  if (!isExec) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[800px] mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-bold text-ink-title m-0 flex items-center gap-3">
           <Shield className="text-brand-500" size={28} strokeWidth={2.5}/> Admin Panel
        </h1>
        <p className="text-[14px] text-ink-muted">Manage your year group's operations and content.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Newsletter Management */}
        <Card className="flex flex-col gap-4 border border-border-light shadow-social-card hover:border-brand-300 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 m-0"><Mail className="text-brand-500" size={22} strokeWidth={2.5}/> Newsletter</h2>
              <Badge colorHex="#fef3c7" textHex="#b45309" className="font-bold border border-amber-200">Action Required</Badge>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Review pending posts from members. Only approved posts will be included in the monthly dispatch.
           </p>
           <div className="flex justify-between items-center mt-auto pt-2">
             <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">{new Date().toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}</span>
             <Button size="sm" onClick={() => window.location.href='/app/newsletter'} className="font-bold shadow-sm">Go to Queue</Button>
           </div>
        </Card>

        {/* Campaign Management */}
        <Card className="flex flex-col gap-4 border border-border-light shadow-social-card hover:border-red-300 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 m-0"><Heart className="text-red-500" size={22} strokeWidth={2.5}/> Fundraising</h2>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Create emergency relief efforts or long-term school support campaigns. Track donations and post updates.
           </p>
           <div className="flex justify-between items-center mt-auto pt-2 gap-2">
             <Button size="sm" variant="secondary" className="flex-1 font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title">Create New</Button>
             <Button size="sm" variant="ghost" className="font-bold text-ink-muted hover:text-ink-title px-2">Manage</Button>
           </div>
        </Card>

        {/* Events Management */}
        <Card className="flex flex-col gap-4 border border-border-light shadow-social-card hover:border-blue-300 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 m-0"><Calendar className="text-blue-500" size={22} strokeWidth={2.5}/> Events</h2>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Schedule virtual hangouts, in-person meetups, or cross-school webinars. Track RSVPs.
           </p>
           <div className="flex justify-between items-center mt-auto pt-2 gap-2">
             <Button size="sm" variant="secondary" className="flex-1 font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title">Create Event</Button>
             <Button size="sm" variant="ghost" className="font-bold text-ink-muted hover:text-ink-title px-2">Manage</Button>
           </div>
        </Card>

        {/* Roles & Members Management */}
        <Card className="flex flex-col gap-4 border border-border-light shadow-social-card hover:border-amber-300 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 m-0"><Shield className="text-amber-500" size={22} strokeWidth={2.5}/> Governance</h2>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Assign roles to members within your jurisdiction (e.g. Vice President, Organiser). Manage member status.
           </p>
           <div className="flex justify-between items-center mt-auto pt-2 gap-2">
             <Button size="sm" variant="secondary" className="flex-1 font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title">Roles</Button>
             <Button size="sm" variant="ghost" className="font-bold text-ink-muted hover:text-ink-title px-2">Members</Button>
           </div>
        </Card>

      </div>
    </div>
  );
}
