import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Modal, Input } from '../components/ui';
import { api, authState } from '../api/client';
import { toast } from 'react-hot-toast';
import { 
  Monitor, Users, School, AlertTriangle, FileText, UserPlus, Trash2, 
  ArrowUpRight, Clock, Eye, Activity, Shield, ChevronRight, RefreshCw
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { Dashboard } from './Dashboard';

const TIERS = [
  { id: 1, scope: 'yeargroup', label: 'T1 — Year Group', color: '#2563EB', desc: 'YG Presidents, Secretaries' },
  { id: 2, scope: 'club', label: 'T2 — Club', color: '#7C3AED', desc: 'Club Execs' },
  { id: 3, scope: 'house', label: 'T3 — House', color: '#16A34A', desc: 'House Execs' },
  { id: 4, scope: 'school', label: 'T4 — School', color: '#F59E0B', desc: 'School Administrators' },
  { id: 5, scope: 'all', label: 'T5 — Platform', color: '#0F172A', desc: 'ICUNI Labs / IT Department' },
];

export function Cockpit() {
  const user = authState.getUser();
  const { setScope } = useTenant();
  const [mode, setMode] = useState('cockpit'); // 'cockpit' | 'user'
  const [activeTier, setActiveTier] = useState(5);
  const [overviewData, setOverviewData] = useState(null);
  const [staffRoster, setStaffRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);

  // Add Staff Modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' });
  const [addingStaff, setAddingStaff] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, roster] = await Promise.all([
        api.getSystemOverview(),
        api.getStaffRoster()
      ]);
      setOverviewData(overview);
      setStaffRoster(roster || []);
    } catch (e) {
      console.error("Cockpit load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const handleTierSwitch = (tier) => {
    setActiveTier(tier.id);
    const scopeUser = authState.getUser();
    let scopeId = scopeUser?.school || 'default';
    let scopeLabel = tier.label;
    if (tier.scope === 'yeargroup') { scopeId = scopeUser?.year_group_id || scopeId; scopeLabel = scopeUser?.year_group_nickname || 'Year Group'; }
    else if (tier.scope === 'house') { scopeId = scopeUser?.house_name || scopeId; scopeLabel = scopeUser?.house_name || 'House'; }
    else if (tier.scope === 'all') { scopeId = 'all'; scopeLabel = 'All Schools'; }
    setScope(tier.scope, scopeId, scopeLabel);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setAddingStaff(true);
    try {
      const result = await api.addStaffMember(newStaff);
      if (result.error) throw new Error(result.error);
      toast.success(`${newStaff.name} added to IT Department`);
      setIsAddStaffOpen(false);
      setNewStaff({ name: '', email: '', password: '' });
      const roster = await api.getStaffRoster();
      setStaffRoster(roster || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAddingStaff(false);
    }
  };

  const handleRemoveStaff = async (staffId, staffName) => {
    if (!window.confirm(`Remove ${staffName} from IT Department? They'll be demoted to Member.`)) return;
    setStaffLoading(true);
    try {
      await api.removeStaffMember(staffId);
      toast.success(`${staffName} removed from IT Department`);
      const roster = await api.getStaffRoster();
      setStaffRoster(roster || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setStaffLoading(false);
    }
  };

  // User Mode — show Dashboard with tier switcher
  if (mode === 'user') {
    return (
      <div className="flex flex-col gap-0">
        {/* Mode + Tier Switcher Bar */}
        <div className="sticky top-0 z-30 bg-surface-default/95 backdrop-blur-md border-b border-border-light shadow-sm -mx-4 px-4 py-2 mb-4">
          <div className="flex items-center justify-between gap-3 max-w-[800px] mx-auto">
            <button
              onClick={() => setMode('cockpit')}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[13px] font-bold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Monitor size={14} /> Cockpit
            </button>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {TIERS.map(tier => (
                <button
                  key={tier.id}
                  onClick={() => handleTierSwitch(tier)}
                  title={tier.desc}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap ${
                    activeTier === tier.id
                      ? 'text-white shadow-md scale-105'
                      : 'bg-surface-muted text-ink-muted hover:text-ink-title hover:bg-surface-hover'
                  }`}
                  style={activeTier === tier.id ? { backgroundColor: tier.color } : {}}
                >
                  T{tier.id}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Dashboard />
      </div>
    );
  }

  // Cockpit Mode
  return (
    <div className="flex flex-col gap-5 pb-12">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold text-ink-title m-0 flex items-center gap-3">
            <Monitor className="text-slate-600" size={26} strokeWidth={2.5} />
            ICUNI Labs Cockpit
          </h1>
          <p className="text-[13px] text-ink-muted">Platform engineering & governance control centre</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMode('user'); handleTierSwitch(TIERS[0]); }}
            className="flex items-center gap-2 px-3 py-2 bg-brand-500 text-white rounded-xl text-[13px] font-bold hover:bg-brand-600 transition-colors shadow-sm"
          >
            <Eye size={14} /> User View
          </button>
          <button
            onClick={loadOverview}
            disabled={loading}
            className="p-2 bg-surface-muted rounded-xl text-ink-muted hover:text-ink-title hover:bg-surface-hover transition-colors border border-border-light"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-muted rounded-2xl border border-border-light" />
            ))}
          </div>
          <div className="h-64 bg-surface-muted rounded-2xl border border-border-light" />
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard icon={School} label="Schools" value={overviewData?.totalSchools || 0} color="#2563EB" />
            <KPICard icon={Users} label="Members" value={overviewData?.totalMembers || 0} color="#16A34A" />
            <KPICard icon={AlertTriangle} label="Open Tickets" value={overviewData?.openTickets || 0} color={overviewData?.escalatedTickets > 0 ? '#DC2626' : '#F59E0B'} />
            <KPICard icon={FileText} label="Pending Posts" value={overviewData?.pendingPosts || 0} color="#7C3AED" />
          </div>

          {/* Schools Overview */}
          <Card className="border border-border-light shadow-social-card">
            <div className="flex items-center justify-between border-b border-border-light pb-3 mb-3">
              <h2 className="text-[16px] font-bold text-ink-title m-0 flex items-center gap-2">
                <School size={18} className="text-brand-500" /> Schools Registry
              </h2>
              <Badge colorHex="#dcfce7" textHex="#16a34a" className="font-bold border border-green-200">
                {overviewData?.totalSchools || 0} Active
              </Badge>
            </div>
            {overviewData?.schools?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {overviewData.schools.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-surface-muted rounded-xl border border-border-light hover:border-brand-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-500 text-white flex items-center justify-center text-[13px] font-bold shadow-sm">
                        {(s.name || '?').charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-ink-title">{s.name}</span>
                        <span className="text-[11px] text-ink-muted">{s.memberCount} members • {s.openTicketCount} open tickets</span>
                      </div>
                    </div>
                    <Badge
                      colorHex={s.status === 'Active' || s.status === 'Approved' ? '#dcfce7' : '#fef3c7'}
                      textHex={s.status === 'Active' || s.status === 'Approved' ? '#16a34a' : '#b45309'}
                      className="font-bold border uppercase text-[10px] tracking-widest"
                    >
                      {s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-ink-muted text-[13px]">No schools onboarded yet.</div>
            )}
          </Card>

          {/* Escalated Tickets */}
          <Card className="border border-border-light shadow-social-card">
            <div className="flex items-center justify-between border-b border-border-light pb-3 mb-3">
              <h2 className="text-[16px] font-bold text-ink-title m-0 flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" /> Escalated Tickets
              </h2>
              {overviewData?.escalatedTickets > 0 && (
                <Badge colorHex="#fee2e2" textHex="#dc2626" className="font-bold border border-red-200">
                  {overviewData.escalatedTickets} Escalated
                </Badge>
              )}
            </div>
            {overviewData?.escalatedTicketsList?.length > 0 ? (
              <div className="flex flex-col gap-2">
                {overviewData.escalatedTicketsList.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-200 hover:border-red-300 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="text-[14px] font-bold text-ink-title">{t.issue_type}</span>
                      <span className="text-[12px] text-ink-muted">{t.author_name} • Tier: {t.current_tier}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-ink-muted">
                      <Clock size={12} />
                      {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-ink-muted text-[13px] flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <Shield size={20} className="text-green-500" />
                </div>
                No escalated tickets — system healthy
              </div>
            )}
          </Card>

          {/* Staff Roster */}
          <Card className="border border-border-light shadow-social-card">
            <div className="flex items-center justify-between border-b border-border-light pb-3 mb-3">
              <h2 className="text-[16px] font-bold text-ink-title m-0 flex items-center gap-2">
                <Shield size={18} className="text-slate-600" /> ICUNI Labs Staff
              </h2>
              <Button size="sm" className="font-bold shadow-sm flex items-center gap-1.5" onClick={() => setIsAddStaffOpen(true)}>
                <UserPlus size={14} /> Add Staff
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {staffRoster.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-surface-muted rounded-xl border border-border-light hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    {s.profile_pic ? (
                      <img src={s.profile_pic} className="w-9 h-9 rounded-full object-cover shadow-sm" alt="" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center text-[13px] font-bold shadow-sm">
                        {s.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-ink-title">{s.name}</span>
                      <span className="text-[11px] text-ink-muted">{s.email} • IT Department</span>
                    </div>
                  </div>
                  {s.id !== user?.id && (
                    <button
                      onClick={() => handleRemoveStaff(s.id, s.name)}
                      disabled={staffLoading}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from IT Department"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          {overviewData?.recentActivity?.length > 0 && (
            <Card className="border border-border-light shadow-social-card">
              <div className="flex items-center justify-between border-b border-border-light pb-3 mb-3">
                <h2 className="text-[16px] font-bold text-ink-title m-0 flex items-center gap-2">
                  <Activity size={18} className="text-brand-500" /> Recent Activity
                </h2>
              </div>
              <div className="flex flex-col gap-1">
                {overviewData.recentActivity.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-1 border-b border-border-light/50 last:border-b-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-sm flex-shrink-0 ${a.type === 'ticket' ? 'bg-amber-500' : 'bg-brand-500'}`}>
                      {a.type === 'ticket' ? '🎫' : '📝'}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[13px] font-bold text-ink-title truncate">{a.label}</span>
                      <span className="text-[11px] text-ink-muted">{a.actor} • {new Date(a.date).toLocaleDateString()}</span>
                    </div>
                    <Badge
                      colorHex={a.status === 'Approved' || a.status === 'Resolved' ? '#dcfce7' : a.status === 'Escalated' ? '#fee2e2' : '#fef3c7'}
                      textHex={a.status === 'Approved' || a.status === 'Resolved' ? '#16a34a' : a.status === 'Escalated' ? '#dc2626' : '#b45309'}
                      className="font-bold text-[10px] uppercase tracking-wider flex-shrink-0"
                    >
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tier Architecture Reference */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <h3 className="text-[13px] font-bold text-slate-600 uppercase tracking-widest mb-3">5-Tier Governance Architecture</h3>
            <div className="flex flex-wrap gap-2">
              {TIERS.map(tier => (
                <div
                  key={tier.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-white text-[12px] font-bold shadow-sm transition-transform hover:scale-105 cursor-default"
                  style={{ backgroundColor: tier.color }}
                >
                  <span className="opacity-70">T{tier.id}</span>
                  <ChevronRight size={10} />
                  <span>{tier.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add Staff Modal */}
      <Modal isOpen={isAddStaffOpen} onClose={() => setIsAddStaffOpen(false)} title="Add ICUNI Labs Staff">
        <form onSubmit={handleAddStaff} className="flex flex-col gap-4 mt-2">
          <p className="text-[13px] text-ink-body leading-relaxed">
            This will create a new <strong>IT Department</strong> account with full platform access. The user will be pre-verified and bypass all verification walls.
          </p>
          <Input
            label="Full Name"
            required
            value={newStaff.name}
            onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
            placeholder="e.g. John Mensah"
          />
          <Input
            label="Email Address"
            type="email"
            required
            value={newStaff.email}
            onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
            placeholder="e.g. john@icuni.org"
          />
          <Input
            label="Temporary Password"
            required
            value={newStaff.password}
            onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
            placeholder="Minimum 8 characters"
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddStaffOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addingStaff} className="flex items-center gap-2">
              <UserPlus size={16} /> {addingStaff ? 'Creating...' : 'Add to Team'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function KPICard({ icon: IconComp, label, value, color }) {
  return (
    <div className="bg-surface-default border border-border-light rounded-2xl p-4 shadow-social-card flex flex-col items-center justify-center gap-1.5 hover:shadow-md transition-shadow">
      <div className="p-2.5 rounded-full mb-0.5" style={{ backgroundColor: color + '15' }}>
        <IconComp size={22} strokeWidth={2.5} style={{ color }} />
      </div>
      <span className="text-2xl font-black text-ink-title leading-none">{value}</span>
      <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">{label}</span>
    </div>
  );
}
