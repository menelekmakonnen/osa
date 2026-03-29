import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, Modal, Input } from '../components/ui';
import { Heart, AlertTriangle, Clock, Users, PlusCircle } from 'lucide-react';
import { authState } from '../api/client';
import toast from 'react-hot-toast';

export function Fundraising() {
  const [activeFilter, setActiveFilter] = useState('all'); // all, emergency, school_support
  const [scopeFilter, setScopeFilter] = useState('my_school'); // my_school, all_schools
  
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = authState.getUser();
  const isAdmin = user && (user.role.includes("Admin") || user.role === "ICUNI Staff");

  // Donation Modal
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donating, setDonating] = useState(false);

  // Create Campaign Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ title: '', description: '', type: 'emergency', target_amount: '', currency: 'GHS', deadline: '' });
  const [creating, setCreating] = useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCampaigns(scopeFilter);
      setCampaigns(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [scopeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDonate = async (e) => {
    e.preventDefault();
    setDonating(true);
    try {
      if(!donationAmount || isNaN(donationAmount) || parseFloat(donationAmount) <= 0) {
          throw new Error("Please enter a valid amount.");
      }
      await api.donate({ campaign_id: selectedCampaign.id, amount: parseFloat(donationAmount), is_anonymous: isAnonymous });
      setSelectedCampaign(null);
      setDonationAmount('');
      setIsAnonymous(false);
      loadData();
      toast.success("Pledge recorded successfully! You will receive an email receipt.");
    } catch(err) {
      toast.error("Error: " + err.message);
    } finally {
      setDonating(false);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createCampaign({
        ...newCampaign,
        target_amount: parseFloat(newCampaign.target_amount),
        scope_type: 'school',
        scope_id: user?.school || ''
      });
      toast.success("Campaign created successfully!");
      setIsCreateOpen(false);
      setNewCampaign({ title: '', description: '', type: 'emergency', target_amount: '', currency: 'GHS', deadline: '' });
      loadData();
    } catch(err) {
      toast.error("Error: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (activeFilter === 'all') return true;
    return c.type === activeFilter;
  });

  return (
    <div className="flex flex-col gap-4 pb-12 w-full max-w-[680px] mx-auto">
      
      {/* Header Area */}
      <div className="bg-surface-default p-4 rounded-[var(--radius-social)] shadow-social-card border border-border-light flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-ink-title m-0">Fundraising</h1>
              <p className="text-[14px] text-ink-muted mt-0.5">Support your community during emergencies and school development.</p>
            </div>
            {isAdmin && (
                <Button 
                   onClick={() => setIsCreateOpen(true)} 
                   className="gap-2 shrink-0 bg-surface-muted hover:bg-surface-hover text-ink-title border-none font-semibold text-[14px]"
                >
                   <PlusCircle size={18} /> Create Campaign
                </Button>
            )}
        </div>

        {/* Segmented Control Filters */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-border-light pt-3">
           <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <FilterButton label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
              <FilterButton label="Emergencies" active={activeFilter === 'emergency'} onClick={() => setActiveFilter('emergency')} />
              <FilterButton label="School Support" active={activeFilter === 'school_support'} onClick={() => setActiveFilter('school_support')} />
           </div>
           <select 
             className="bg-surface-muted border border-border-light rounded-lg text-[13px] font-semibold text-ink-title px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
             value={scopeFilter}
             onChange={(e) => setScopeFilter(e.target.value)}
           >
             <option value="my_school">My School</option>
             <option value="all_schools">All Schools</option>
           </select>
        </div>
      </div>

      {/* Campaign Grid (Stacked like feed) */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse pt-2">
             <div className="h-48 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 text-ink-muted bg-surface-default rounded-[var(--radius-social)] border border-border-light shadow-social-card">
             No active campaigns found.
          </div>
        ) : (
          filteredCampaigns.map(c => (
            <CampaignCard 
              key={c.id} 
              campaign={c} 
              onDonate={() => setSelectedCampaign(c)} 
            />
          ))
        )}
      </div>

      {/* Donation Modal */}
      <Modal isOpen={!!selectedCampaign} onClose={() => { if(!donating) { setSelectedCampaign(null); setIsAnonymous(false); } }} title="Make a Contribution">
         {selectedCampaign && (
            <form onSubmit={handleDonate} className="flex flex-col gap-4 mt-2">
               <div className="p-4 bg-parchment rounded-md mb-2">
                 <h4 className="font-heading text-lg mb-1">{selectedCampaign.title}</h4>
                 <p className="text-sm text-muted line-clamp-2">{selectedCampaign.description}</p>
                 <div className="mt-3 flex gap-2 font-mono text-sm">
                    <strong>Target:</strong> {selectedCampaign.currency} {selectedCampaign.target_amount}
                 </div>
               </div>

               <p className="text-sm font-medium">Select Amount or Enter Custom</p>
               <div className="flex gap-2 flex-wrap">
                  {[50, 100, 200, 500].map(amt => (
                    <button 
                       type="button" 
                       key={amt}
                       className={`px-3 py-1.5 border rounded-md text-sm transition-colors ${
                         donationAmount == amt ? 'bg-forest text-white border-forest' : 'border-border hover:bg-cream'
                       }`}
                       onClick={() => setDonationAmount(amt)}
                    >
                       {selectedCampaign.currency} {amt}
                    </button>
                  ))}
               </div>

               <Input 
                 type="number" 
                 label="Custom Amount" 
                 placeholder={`Enter amount in ${selectedCampaign.currency}`}
                 value={donationAmount}
                 onChange={(e) => setDonationAmount(e.target.value)}
                 required
                 min="1"
                 autoFocus
               />

               <label className="flex items-center gap-2 cursor-pointer mt-1 mb-2">
                 <input type="checkbox" className="w-4 h-4 text-brand-500 rounded border-border-light focus:ring-brand-500" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
                 <span className="text-[14px] text-ink-title font-medium">Make this interaction anonymous</span>
               </label>
               <p className="text-xs text-muted mb-4 leading-relaxed">
                 Note: By clicking confirm, your pledge will be recorded as <strong className="text-amber-600">Pending</strong> and requires administrative reconciliation. A receipt will be emailed to you with instructions to fulfill the payment via Bank Transfer or Mobile Money.
               </p>

               <div className="flex justify-end gap-2 text-white">
                 <Button variant="ghost" type="button" onClick={() => setSelectedCampaign(null)}>Cancel</Button>
                 <Button type="submit" disabled={donating}>Confirm Pledge</Button>
               </div>
            </form>
         )}
      </Modal>

      {/* Create Campaign Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => !creating && setIsCreateOpen(false)} title="Create Campaign">
        <form onSubmit={handleCreateCampaign} className="flex flex-col gap-4 mt-2">
          <Input label="Campaign Title" required value={newCampaign.title} onChange={e => setNewCampaign({...newCampaign, title: e.target.value})} placeholder="e.g. Emergency Food Fund 2026" />
          <div>
            <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Campaign Type</label>
            <select className="social-input" value={newCampaign.type} onChange={e => setNewCampaign({...newCampaign, type: e.target.value})}>
              <option value="emergency">Emergency</option>
              <option value="school_support">School Support</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target Amount" type="number" required min="1" value={newCampaign.target_amount} onChange={e => setNewCampaign({...newCampaign, target_amount: e.target.value})} placeholder="e.g. 5000" />
            <div>
              <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Currency</label>
              <select className="social-input" value={newCampaign.currency} onChange={e => setNewCampaign({...newCampaign, currency: e.target.value})}>
                <option value="GHS">GHS</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Description</label>
            <textarea className="social-input min-h-[80px] resize-none" required value={newCampaign.description} onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} placeholder="Describe the purpose and impact of this campaign..." />
          </div>
          <Input label="Deadline (optional)" type="date" value={newCampaign.deadline} onChange={e => setNewCampaign({...newCampaign, deadline: e.target.value})} />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Launch Campaign'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Helpers

function FilterButton({ active, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-1.5 text-[13px] font-bold rounded-pill transition-all duration-200 whitespace-nowrap ${
        active 
          ? 'bg-ink-title text-white shadow-sm' 
          : 'bg-surface-muted text-ink-body hover:bg-surface-hover hover:text-ink-title'
      }`}
    >
      {label}
    </button>
  );
}

function CampaignCard({ campaign, onDonate }) {
  const isEmergency = campaign.type === 'emergency';
  
  // Calculate Progress safely
  const target = parseFloat(campaign.target_amount) || 1;
  const raised = parseFloat(campaign.raised_amount) || 0;
  let percent = Math.floor((raised / target) * 100);
  if(percent > 100) percent = 100;

  return (
    <Card 
      className={`flex flex-col gap-0 !p-0 border border-border-light shadow-social-card relative overflow-hidden transition-all ${
        isEmergency ? 'border-t-[4px] border-t-red-500' : 'border-t-[4px] border-t-brand-500'
      }`}
    >
      <div className="p-4">
        {/* Header Tags */}
        <div className="flex justify-between items-start mb-2">
           {isEmergency ? (
               <div className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  <AlertTriangle size={14} strokeWidth={2.5}/> Emergency
               </div>
           ) : (
               <div className="flex items-center gap-1.5 text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  <Heart size={14} strokeWidth={2.5}/> School Support
               </div>
           )}
           <Badge>{campaign.scope === 'school' ? 'All School' : 'Year Group'}</Badge>
        </div>

        <h3 className="text-[18px] font-bold text-ink-title m-0 leading-tight mb-2">{campaign.title}</h3>
        <p className="text-[15px] text-ink-title flex-1 line-clamp-3 leading-relaxed mb-4">
          {campaign.description}
        </p>

        {/* Progress Bar & Details */}
        <div className="flex flex-col gap-2 mt-auto">
           <div className="flex justify-between text-[13px] font-bold text-ink-title">
              <span>{campaign.currency} {raised.toLocaleString()} raised</span>
              <span className="text-ink-muted">of {campaign.currency} {target.toLocaleString()}</span>
           </div>
           <div className="w-full h-2.5 bg-surface-muted rounded-pill overflow-hidden border border-border-light">
              <div 
                 className={`h-full transition-all duration-1000 ease-out rounded-pill ${isEmergency ? 'bg-red-500' : 'bg-brand-500'}`} 
                 style={{ width: `${percent}%` }}
                 title={`${percent}% completed`}
              />
           </div>
           
           <div className="flex justify-between text-[12px] font-semibold text-ink-muted mt-1">
              <span className="flex items-center gap-1"><Users size={14} strokeWidth={2.5}/> {campaign.donor_count || 0} donors</span>
              {campaign.deadline && (
                  <span className="flex items-center gap-1 text-red-500 font-bold"><Clock size={14} strokeWidth={2.5}/> Ends {new Date(campaign.deadline).toLocaleDateString()}</span>
              )}
           </div>
        </div>
      </div>
      
      {/* Footer Action */}
      <div className="p-4 border-t border-border-light bg-surface-muted/50">
        <Button onClick={onDonate} className="w-full font-bold text-[15px] shadow-sm" variant={isEmergency ? 'danger' : 'primary'}>
            Donate Now
        </Button>
      </div>
    </Card>
  );
}
