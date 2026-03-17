import React, { useState } from 'react';
import { Card, Button, Badge } from '../components/ui';
import { authState } from '../api/client';
import { HelpCircle, AlertTriangle, ArrowUpRight, Clock, CheckCircle } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export function Support() {
  const user = authState.getUser();
  const { activeScope } = useTenant();
  
  const [tickets, setTickets] = useState([]);

  React.useEffect(() => {
     setTickets([
        {
           id: "TCK-9421",
           issue_type: "Access Control",
           description: "I cannot see my House posts anymore after the latest update.",
           status: "Open",
           current_tier: 1, // YG President queue
           tier_label: "Tier 1: Year Group",
           author_name: "Kwame Mensah",
           created_at: new Date(Date.now() - 86400000).toISOString(),
           escalation_warning: false
        },
        {
           id: "TCK-8102",
           issue_type: "Platform Bug",
           description: "The 'Create Album' button throws a null pointer error on mobile browsers.",
           status: "Escalated",
           current_tier: 4, // School President queue
           tier_label: "Tier 4: School Exec",
           author_name: "Abena Osei",
           created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
           escalation_warning: true // SLA breach warning
        },
        {
           id: "TCK-1055",
           issue_type: "Data Deletion Request",
           description: "Requesting removal of my dormant account from the 2010 registry.",
           status: "In Progress",
           current_tier: 5, // ICUNI Labs queue
           tier_label: "Tier 5: ICUNI Labs",
           author_name: "David K.",
           created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
           escalation_warning: false
        }
     ]);
  }, []);

  const [activeTab, setActiveTab] = useState('my_tickets');

  const isExec = user?.role?.includes("President") || user?.role?.includes("Admin") || user?.role === "IT Department";

  return (
    <div className="flex flex-col gap-6 w-full max-w-[800px] mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-bold text-ink-title m-0 flex items-center gap-3">
           <HelpCircle className="text-brand-500" size={28} strokeWidth={2.5}/> Tech Support
        </h1>
        <p className="text-[14px] text-ink-muted">Submit platform issues and track SLA resolution escalations.</p>
      </div>

      <div className="flex bg-surface-muted p-1 rounded-lg border border-border-light shadow-sm self-start">
         <button 
            className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors ${activeTab === 'my_tickets' ? 'bg-surface-default shadow text-ink-title' : 'text-ink-muted hover:text-ink-title'}`}
            onClick={() => setActiveTab('my_tickets')}
         >
            My Tickets
         </button>
         {isExec && (
            <button 
               className={`px-4 py-1.5 rounded-md text-[13px] font-bold transition-colors flex items-center gap-2 ${activeTab === 'queue' ? 'bg-surface-default shadow text-brand-600' : 'text-ink-muted hover:text-ink-title'}`}
               onClick={() => setActiveTab('queue')}
            >
               Admin Queue <Badge colorHex="#fee2e2" textHex="#dc2626" className="font-bold border border-red-200 px-1 py-0 min-w-[20px] justify-center ml-1">2</Badge>
            </button>
         )}
      </div>

      {/* Ticket List View */}
      <div className="flex flex-col gap-4">
          {activeTab === 'my_tickets' && (
             <div className="flex justify-end mb-2">
                <Button size="sm" className="font-bold shadow-sm">Submit New Ticket</Button>
             </div>
          )}

          {tickets.map(t => (
             <Card key={t.id} className={`flex flex-col gap-3 border ${t.escalation_warning ? 'border-amber-300' : 'border-border-light'} shadow-social-card transition-colors hover:shadow-md`}>
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <h3 className="text-[16px] font-bold text-ink-title m-0">{t.issue_type}</h3>
                      <span className="text-[12px] font-mono text-ink-muted">#{t.id}</span>
                   </div>
                   <Badge 
                      colorHex={t.status === 'Open' ? '#dcfce7' : t.status === 'Escalated' ? '#fee2e2' : '#fef3c7'} 
                      textHex={t.status === 'Open' ? '#16a34a' : t.status === 'Escalated' ? '#dc2626' : '#b45309'}
                      className="font-bold shadow-sm"
                   >
                      {t.status}
                   </Badge>
                </div>
                
                <p className="text-[14px] text-ink-body leading-relaxed m-0">{t.description}</p>
                
                <div className="mt-2 pt-3 border-t border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
                   <div className="flex items-center gap-4 text-ink-muted font-semibold">
                      <span className="flex items-center gap-1.5"><ArrowUpRight size={14}/> Routing: <span className="text-ink-title">{t.tier_label}</span></span>
                      <span className="flex items-center gap-1.5"><Clock size={14}/> {new Date(t.created_at).toLocaleDateString()}</span>
                   </div>
                   
                   {activeTab === 'queue' && (
                      <div className="flex gap-2">
                         <Button size="sm" variant="ghost" className="h-7 text-[12px] px-2 font-bold text-amber-600 hover:text-amber-700 bg-amber-50">Escalate Tier</Button>
                         <Button size="sm" variant="secondary" className="h-7 text-[12px] px-2 font-bold bg-surface-muted text-ink-title border border-border-light shadow-sm flex items-center gap-1"><CheckCircle size={14}/> Resolve</Button>
                      </div>
                   )}
                </div>
             </Card>
          ))}
          
          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[13px] leading-relaxed">
             <strong>SLA Escalation Engine:</strong> Unresolved tickets automatically bounce upward through the 5 Tiers (Year Group → Club → House → School Exec → ICUNI Labs) every 48 hours to guarantee resolution accountability.
          </div>
      </div>
    </div>
  );
}
