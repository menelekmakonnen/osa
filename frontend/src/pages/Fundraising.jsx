import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, Modal, Input, Skeleton } from '../components/ui';
import { ErrorCard } from '../components/ErrorCard';
import { Heart, AlertTriangle, Clock, Users, PlusCircle } from 'lucide-react';
import { authState } from '../api/client';
import toast from 'react-hot-toast';

export function Fundraising() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('my_school');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = authState.getUser();
  const userRole = user?.role || 'Member';
  const isAdmin = userRole.includes('Admin') || userRole === 'IT Department' || userRole === 'ICUNI Staff' || userRole.includes('President') || userRole.includes('Finance');

  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [donating, setDonating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ title: '', description: '', type: 'emergency', target_amount: '', currency: 'GHS', deadline: '' });
  const [creating, setCreating] = useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { setCampaigns(await api.getCampaigns(scopeFilter) || []); }
    catch (e) { setError(e.message || 'Failed to load campaigns'); }
    finally { setLoading(false); }
  }, [scopeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDonate = async (e) => {
    e.preventDefault(); setDonating(true);
    try {
      if(!donationAmount || isNaN(donationAmount) || parseFloat(donationAmount) <= 0) throw new Error("Please enter a valid amount.");
      await api.donate({ campaign_id: selectedCampaign.id, amount: parseFloat(donationAmount), is_anonymous: isAnonymous });
      setSelectedCampaign(null); setDonationAmount(''); setIsAnonymous(false);
      loadData(); toast.success("Pledge recorded! You'll receive an email receipt.");
    } catch(err) { toast.error(err.message); }
    finally { setDonating(false); }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      await api.createCampaign({ ...newCampaign, target_amount: parseFloat(newCampaign.target_amount), scope_type: 'school', scope_id: user?.school || '' });
      toast.success("Campaign created!");
      setIsCreateOpen(false); setNewCampaign({ title: '', description: '', type: 'emergency', target_amount: '', currency: 'GHS', deadline: '' });
      loadData();
    } catch(err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const filteredCampaigns = campaigns.filter(c => activeFilter === 'all' || c.type === activeFilter);

  return (
    <div className="flex flex-col gap-4 pb-12 w-full animate-fade-in">
      {error && <ErrorCard message={error} onRetry={loadData} context="Fundraising" />}
      
      <Card className="!p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-ink-title m-0 tracking-tight">Fundraising</h1>
            <p className="text-[13px] text-ink-muted mt-0.5">Support your community during emergencies and development.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)} variant="secondary" size="sm" className="gap-1.5 shrink-0">
              <PlusCircle size={16} /> Create
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-border-light pt-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <FilterPill label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
            <FilterPill label="Emergencies" active={activeFilter === 'emergency'} onClick={() => setActiveFilter('emergency')} />
            <FilterPill label="School Support" active={activeFilter === 'school_support'} onClick={() => setActiveFilter('school_support')} />
          </div>
          <select className="osa-select !w-auto !py-1.5 text-[12px]" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
            <option value="my_school">My School</option>
            <option value="all_schools">All Schools</option>
          </select>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-4"><div className="skeleton h-52 rounded-2xl" /><div className="skeleton h-52 rounded-2xl" /></div>
        ) : filteredCampaigns.length === 0 ? (
          <Card className="text-center py-12 text-ink-muted text-[14px]">No active campaigns found.</Card>
        ) : (
          <div className="stagger-children flex flex-col gap-4">
            {filteredCampaigns.map(c => <CampaignCard key={c.id} campaign={c} onDonate={() => setSelectedCampaign(c)} />)}
          </div>
        )}
      </div>

      {/* Donate Modal */}
      <Modal isOpen={!!selectedCampaign} onClose={() => { if(!donating) { setSelectedCampaign(null); setIsAnonymous(false); } }} title="Make a Contribution">
        {selectedCampaign && (
          <form onSubmit={handleDonate} className="flex flex-col gap-4 mt-2">
            <div className="p-4 bg-surface-muted rounded-xl border border-border-light">
              <h4 className="font-bold text-ink-title text-[15px] mb-1">{selectedCampaign.title}</h4>
              <p className="text-[13px] text-ink-muted line-clamp-2">{selectedCampaign.description}</p>
              <div className="mt-2 text-[13px] font-semibold text-ink-body"><strong>Target:</strong> {selectedCampaign.currency} {selectedCampaign.target_amount}</div>
            </div>
            <p className="text-[13px] font-semibold text-ink-title">Select or enter amount</p>
            <div className="flex gap-2 flex-wrap">
              {[50, 100, 200, 500].map(amt => (
                <button type="button" key={amt} className={`px-3.5 py-2 border rounded-xl text-[13px] font-semibold transition-all ${donationAmount == amt ? 'bg-school text-white border-school shadow-sm' : 'border-border-light hover:bg-surface-hover text-ink-title'}`} onClick={() => setDonationAmount(amt)}>
                  {selectedCampaign.currency} {amt}
                </button>
              ))}
            </div>
            <Input type="number" label="Custom Amount" placeholder={`Amount in ${selectedCampaign.currency}`} value={donationAmount} onChange={(e) => setDonationAmount(e.target.value)} required min="1" autoFocus />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-border-light" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />
              <span className="text-[13px] text-ink-title font-medium">Make this anonymous</span>
            </label>
            <p className="text-[11px] text-ink-muted leading-relaxed">Your pledge is <strong className="text-amber-600">Pending</strong> until admin reconciliation. A receipt will be emailed.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setSelectedCampaign(null)}>Cancel</Button>
              <Button type="submit" loading={donating}>Confirm Pledge</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => !creating && setIsCreateOpen(false)} title="Create Campaign">
        <form onSubmit={handleCreateCampaign} className="flex flex-col gap-4 mt-2">
          <Input label="Campaign Title" required value={newCampaign.title} onChange={e => setNewCampaign({...newCampaign, title: e.target.value})} placeholder="e.g. Emergency Food Fund 2026" />
          <div>
            <label className="block text-[13px] font-semibold text-ink-body mb-1.5 ml-0.5">Campaign Type</label>
            <select className="osa-select" value={newCampaign.type} onChange={e => setNewCampaign({...newCampaign, type: e.target.value})}>
              <option value="emergency">Emergency</option>
              <option value="school_support">School Support</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Target Amount" type="number" required min="1" value={newCampaign.target_amount} onChange={e => setNewCampaign({...newCampaign, target_amount: e.target.value})} placeholder="5000" />
            <div>
              <label className="block text-[13px] font-semibold text-ink-body mb-1.5 ml-0.5">Currency</label>
              <select className="osa-select" value={newCampaign.currency} onChange={e => setNewCampaign({...newCampaign, currency: e.target.value})}>
                <option value="GHS">GHS</option><option value="USD">USD</option><option value="GBP">GBP</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-ink-body mb-1.5 ml-0.5">Description</label>
            <textarea className="social-textarea min-h-[80px]" required value={newCampaign.description} onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} placeholder="Describe the purpose and impact..." />
          </div>
          <Input label="Deadline (optional)" type="date" value={newCampaign.deadline} onChange={e => setNewCampaign({...newCampaign, deadline: e.target.value})} />
          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Launch Campaign</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function FilterPill({ active, label, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-1.5 text-[12px] font-semibold rounded-full transition-all whitespace-nowrap ${active ? 'text-white shadow-sm' : 'bg-surface-muted text-ink-body hover:bg-surface-hover hover:text-ink-title'}`} style={active ? { background: 'var(--school-primary)', color: 'var(--school-on-primary)' } : undefined}>
      {label}
    </button>
  );
}

function CampaignCard({ campaign, onDonate }) {
  const isEmergency = campaign.type === 'emergency';
  const target = parseFloat(campaign.target_amount) || 1;
  const raised = parseFloat(campaign.raised_amount) || 0;
  let percent = Math.min(Math.floor((raised / target) * 100), 100);

  return (
    <Card className={`!p-0 flex flex-col overflow-hidden ${isEmergency ? 'border-t-[3px] border-t-red-500' : ''}`} style={!isEmergency ? { borderTopWidth: '3px', borderTopColor: 'var(--school-primary)' } : undefined}>
      <div className="p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          {isEmergency ? (
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              <AlertTriangle size={12} strokeWidth={2.5}/> Emergency
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--school-tint)', color: 'var(--school-primary)', border: '1px solid var(--school-200)' }}>
              <Heart size={12} strokeWidth={2.5}/> School Support
            </div>
          )}
          <Badge>{campaign.scope === 'school' ? 'All School' : 'Year Group'}</Badge>
        </div>

        <h3 className="text-[16px] font-bold text-ink-title m-0 leading-tight">{campaign.title}</h3>
        <p className="text-[14px] text-ink-body line-clamp-3 leading-relaxed">{campaign.description}</p>

        <div className="flex flex-col gap-2 mt-auto">
          <div className="flex justify-between text-[12px] font-semibold text-ink-title">
            <span>{campaign.currency} {raised.toLocaleString()} raised</span>
            <span className="text-ink-muted">of {campaign.currency} {target.toLocaleString()}</span>
          </div>
          <div className="w-full h-2 bg-surface-muted rounded-full overflow-hidden">
            <div className={`h-full transition-all duration-1000 ease-out rounded-full ${isEmergency ? 'bg-red-500' : ''}`} style={{ width: `${percent}%`, background: isEmergency ? undefined : 'var(--school-primary)' }} />
          </div>
          <div className="flex justify-between text-[11px] font-medium text-ink-muted">
            <span className="flex items-center gap-1"><Users size={13}/> {campaign.donor_count || 0} donors</span>
            {campaign.deadline && <span className="flex items-center gap-1 text-red-500 font-semibold"><Clock size={13}/> Ends {new Date(campaign.deadline).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-border-light bg-surface-muted/30">
        <Button onClick={onDonate} className="w-full font-bold" variant={isEmergency ? 'danger' : 'primary'}>Donate Now</Button>
      </div>
    </Card>
  );
}
