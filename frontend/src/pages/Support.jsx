import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Select, Input, Textarea } from '../components/ui';
import { api, authState } from '../api/client';
import { toast } from 'react-hot-toast';
import { HelpCircle, ArrowUpRight, Clock, CheckCircle } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export function Support() {
  const user = authState.getUser();
  const { activeScope } = useTenant(); // We may need this later, but for now just comment or ignore. Actually I'll just remove it.
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my_tickets');

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitData, setSubmitData] = useState({ issue_type: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const isExec = user?.role?.includes("President") || user?.role?.includes("Admin") || user?.role === "IT Department";

  const loadTickets = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTickets();
      setTickets(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitTicket(submitData);
      setIsSubmitModalOpen(false);
      setSubmitData({ issue_type: '', description: '' });
      loadTickets();
      toast.success("Ticket submitted successfully!");
    } catch (err) {
      toast.error("Error submitting ticket: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (ticketId) => {
    if(!window.confirm("Escalate this ticket to the next governance tier?")) return;
    try {
      await api.escalateTicket(ticketId);
      loadTickets();
    } catch (err) {
      toast.error("Error escalating ticket: " + err.message);
    }
  };

  const handleResolve = async (ticketId) => {
    const resolution = window.prompt("Enter resolution note (optional):");
    if (resolution === null) return; // cancelled
    try {
      await api.resolveTicket(ticketId, resolution);
      loadTickets();
    } catch (err) {
      toast.error("Error resolving ticket: " + err.message);
    }
  };

  const issueTypes = [
    { value: '', label: 'Select Issue Type' },
    { value: 'Access Control', label: 'Access Control (Roles/Permissions)' },
    { value: 'Platform Bug', label: 'Platform Bug' },
    { value: 'Data Deletion Request', label: 'Data Deletion Request' },
    { value: 'Other', label: 'Other' }
  ];

  const myTickets = tickets.filter(t => t.author_id === user?.id);
  const queueTickets = tickets.filter(t => t.status !== "Resolved" && t.author_id !== user?.id);

  const displayTickets = activeTab === 'queue' ? queueTickets : myTickets;

  const getTierLabel = (tier) => {
     switch(parseInt(tier)) {
        case 1: return "Tier 1: Year Group";
        case 2: return "Tier 2: Club Execs";
        case 3: return "Tier 3: House Execs";
        case 4: return "Tier 4: School Execs";
        case 5: return "Tier 5: ICUNI Labs";
        default: return `Tier ${tier}`;
     }
  };

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
               Admin Queue {queueTickets.length > 0 && <Badge colorHex="#fee2e2" textHex="#dc2626" className="font-bold border border-red-200 px-1 py-0 min-w-[20px] justify-center ml-1">{queueTickets.length}</Badge>}
            </button>
         )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4 animate-pulse mt-2">
           <div className="h-32 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
            {activeTab === 'my_tickets' && (
               <div className="flex justify-end mb-2">
                  <Button size="sm" className="font-bold shadow-sm" onClick={() => setIsSubmitModalOpen(true)}>Submit New Ticket</Button>
               </div>
            )}

            {displayTickets.length === 0 ? (
                <div className="text-center py-12 text-ink-muted bg-surface-default rounded-[var(--radius-social)] border border-border-light shadow-social-card">
                   No tickets found.
                </div>
            ) : displayTickets.map(t => (
               <Card key={t.id} className={`flex flex-col gap-3 border ${t.status === 'Escalated' ? 'border-amber-300' : 'border-border-light'} shadow-social-card transition-colors hover:shadow-md`}>
                  <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                        <h3 className="text-[16px] font-bold text-ink-title m-0">{t.issue_type}</h3>
                        <span className="text-[12px] font-mono text-ink-muted">#{t.id.split('-')[0]}</span>
                     </div>
                     <Badge 
                        colorHex={t.status === 'Open' ? '#dcfce7' : t.status === 'Resolved' ? '#f1f5f9' : t.status.includes('Escalated') ? '#fee2e2' : '#fef3c7'} 
                        textHex={t.status === 'Open' ? '#16a34a' : t.status === 'Resolved' ? '#64748b' : t.status.includes('Escalated') ? '#dc2626' : '#b45309'}
                        className="font-bold shadow-sm"
                     >
                        {t.status}
                     </Badge>
                  </div>
                  
                  <p className="text-[14px] text-ink-body leading-relaxed m-0">{t.description}</p>
                  
                  <div className="mt-2 pt-3 border-t border-border-light flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px]">
                     <div className="flex items-center gap-4 text-ink-muted font-semibold">
                        <span className="flex items-center gap-1.5"><ArrowUpRight size={14}/> Routing: <span className="text-ink-title">{getTierLabel(t.current_tier)}</span></span>
                        <span className="flex items-center gap-1.5"><Clock size={14}/> {new Date(t.created_at).toLocaleDateString()}</span>
                     </div>
                     
                     {activeTab === 'queue' && t.status !== 'Resolved' && (
                        <div className="flex gap-2">
                           <Button size="sm" variant="ghost" onClick={() => handleEscalate(t.id)} className="h-7 text-[12px] px-2 font-bold text-amber-600 hover:text-amber-700 bg-amber-50">Escalate Tier</Button>
                           <Button size="sm" variant="secondary" onClick={() => handleResolve(t.id)} className="h-7 text-[12px] px-2 font-bold bg-surface-muted text-ink-title border border-border-light shadow-sm flex items-center gap-1"><CheckCircle size={14}/> Resolve</Button>
                        </div>
                     )}
                  </div>
               </Card>
            ))}
            
            <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[13px] leading-relaxed">
               <strong>SLA Escalation Engine:</strong> Unresolved tickets automatically bounce upward through the 5 Tiers (Year Group → Club → House → School Exec → ICUNI Labs) every 48 hours to guarantee resolution accountability.
            </div>
        </div>
      )}

      {/* Submit Modal */}
      <Modal isOpen={isSubmitModalOpen} onClose={() => !submitting && setIsSubmitModalOpen(false)} title="Submit Tech Support Ticket">
        <form onSubmit={handleSubmitTicket} className="flex flex-col gap-4 mt-2">
           <Select 
             label="Issue Type" 
             options={issueTypes} 
             required 
             value={submitData.issue_type}
             onChange={e => setSubmitData({...submitData, issue_type: e.target.value})}
           />
           <Textarea 
             label="Description" 
             placeholder="Please describe the issue in detail..." 
             required 
             rows={5}
             value={submitData.description}
             onChange={e => setSubmitData({...submitData, description: e.target.value})}
           />
           <div className="flex justify-end gap-2 mt-4">
             <Button type="button" variant="ghost" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
             <Button type="submit" disabled={submitting}>
               {submitting ? 'Submitting...' : 'Submit Ticket'}
             </Button>
           </div>
        </form>
      </Modal>

    </div>
  );
}
