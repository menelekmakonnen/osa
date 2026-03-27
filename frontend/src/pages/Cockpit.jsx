import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge, Modal, Input, Select } from '../components/ui';
import { api, authState } from '../api/client';
import { toast } from 'react-hot-toast';
import { 
  Monitor, Users, School, AlertTriangle, FileText, UserPlus, Trash2, 
  ArrowUpRight, Clock, Eye, Activity, Shield, ChevronRight, RefreshCw,
  Database, Search, Save, Settings, Power, Edit2, Table, UserCog, 
  ToggleLeft, ToggleRight, XCircle, CheckCircle, Download
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

const SHEETS = ['members', 'posts', 'campaigns', 'events', 'tickets', 'schools', 'year_groups', 'donations', 'rsvps', 'newsletters', 'board_messages', 'group_settings'];

export function Cockpit() {
  const user = authState.getUser();
  const { setScope } = useTenant();
  const [mode, setMode] = useState('cockpit'); // 'cockpit' | 'user'
  const [activeTier, setActiveTier] = useState(5);
  const [overviewData, setOverviewData] = useState(null);
  const [staffRoster, setStaffRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | schools | data | members | flags

  // Add Staff Modal
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' });
  const [addingStaff, setAddingStaff] = useState(false);

  // Add School Modal
  const [isAddSchoolOpen, setIsAddSchoolOpen] = useState(false);
  const [newSchoolData, setNewSchoolData] = useState({ school_name: '', admin_name: '', admin_email: '', school_type: 'Mixed' });
  const [submittingSchool, setSubmittingSchool] = useState(false);

  // Feature Flags
  const [features, setFeatures] = useState({ fundraising: true, newsletters: true, crossSchoolEvents: true, paymentGateway: false, adminApproval: false });
  const [savingFlags, setSavingFlags] = useState(false);

  // Impersonator State
  const [schoolsList, setSchoolsList] = useState([]);
  const [activeImp, setActiveImp] = useState(null);
  const [impForm, setImpForm] = useState({ schoolId: '', role: 'School Administrator' });


  // Spreadsheet Viewer
  const [selectedSheet, setSelectedSheet] = useState('members');
  const [sheetData, setSheetData] = useState(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetSearch, setSheetSearch] = useState('');
  const [editingCell, setEditingCell] = useState(null); // {rowIndex, col, value}

  // Member Override
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideField, setOverrideField] = useState('role');
  const [overrideValue, setOverrideValue] = useState('');
  const [overriding, setOverriding] = useState(false);

  
  const handleEngage = () => {
      if (!impForm.schoolId) { toast.error('Select a target tenant database.'); return; }
      toast.loading('Engaging Impersonation Context...');
      api.setImpersonation(impForm.schoolId, impForm.role);
  };

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [overview, roster] = await Promise.all([
        api.getSystemOverview(),
        api.getStaffRoster()
      ]);
      setOverviewData(overview);
      setStaffRoster(roster || []);

      const imp = api.getImpersonation();
      setActiveImp(imp);
      const res = await api.getSchools();
      setSchoolsList(res.data || []);

      // Load feature flags
      try {
        const flagsData = await api.getFeatureFlags();
        if (flagsData && Object.keys(flagsData).length > 0) setFeatures(flagsData);
      } catch(e) { /* ignore - use defaults */ }
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

  // Staff Management
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

  // School Management
  const handleAddSchool = async (e) => {
    e.preventDefault();
    setSubmittingSchool(true);
    try {
      const adminUsername = newSchoolData.admin_name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
      await api.onboardSchool({
        name: newSchoolData.admin_name,
        username: adminUsername,
        email: newSchoolData.admin_email,
        password: "TempPassword123!",
        new_school_name: newSchoolData.school_name,
        new_school_type: newSchoolData.school_type,
        new_school_admin_id: adminUsername,
        new_school_motto: "",
        new_school_colours: [],
        new_school_cheque_representation: "N/A",
        new_school_classes: [],
        new_school_houses: []
      });
      toast.success("School onboarded successfully!");
      setIsAddSchoolOpen(false);
      setNewSchoolData({ school_name: '', admin_name: '', admin_email: '', school_type: 'Mixed' });
      loadOverview();
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setSubmittingSchool(false);
    }
  };

  const handleRemoveSchool = async (schoolId, schoolName) => {
    if (!window.confirm(`⚠️ DESTRUCTIVE: Remove "${schoolName}" from the platform? This cannot be undone.`)) return;
    try {
      await api.removeSchool(schoolId);
      toast.success(`School "${schoolName}" removed`);
      loadOverview();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Feature Flags
  const handleSaveFlags = async () => {
    setSavingFlags(true);
    try {
      await api.saveFeatureFlags(features);
      toast.success("Feature flags saved to backend");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingFlags(false);
    }
  };

  // Spreadsheet Viewer
  const loadSheetData = async (sheet) => {
    setSheetLoading(true);
    setSheetSearch('');
    try {
      const data = await api.getSheetDataRaw(sheet, 200);
      setSheetData(data);
    } catch (err) {
      toast.error("Error loading sheet: " + err.message);
    } finally {
      setSheetLoading(false);
    }
  };

  const handleCellEdit = async () => {
    if (!editingCell) return;
    try {
      await api.updateSheetCell(selectedSheet, editingCell.rowIndex, editingCell.col, editingCell.value);
      toast.success("Cell updated");
      setEditingCell(null);
      loadSheetData(selectedSheet);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Member Override
  const searchMembers = async () => {
    if (!memberSearch.trim()) return;
    setMemberSearchLoading(true);
    try {
      const data = await api.getSheetDataRaw('members', 500);
      const search = memberSearch.toLowerCase();
      const filtered = (data?.rows || []).filter(m =>
        (m.name || '').toLowerCase().includes(search) ||
        (m.email || '').toLowerCase().includes(search) ||
        (m.id || '').toLowerCase().includes(search)
      );
      setMemberResults(filtered.slice(0, 20));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setMemberSearchLoading(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideTarget || !overrideField || overrideValue === '') return;
    setOverriding(true);
    try {
      const res = await api.overrideMember(overrideTarget.id, overrideField, overrideValue);
      toast.success(res?.message || "Override applied");
      setOverrideTarget(null);
      setOverrideValue('');
      searchMembers(); // Refresh
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOverriding(false);
    }
  };

  // User Mode — show Dashboard with tier switcher
  if (mode === 'user') {
    return (
      <div className="flex flex-col gap-0">
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
    <div className="flex flex-col gap-0 pb-12 -mx-4 -mt-4 md:-mt-6">

      {/* Dark Header — Distinct from Super Admin */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-5 flex items-center justify-between border-b border-slate-700">
        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-bold text-white m-0 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20"><Monitor className="text-amber-400" size={22} strokeWidth={2.5} /></div>
            ICUNI Labs Cockpit
          </h1>
          <p className="text-[12px] text-slate-400 ml-[46px]">Tier 5 • Full Platform Authority • {user?.name}</p>
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
            className="p-2 bg-slate-700 rounded-xl text-slate-300 hover:text-white hover:bg-slate-600 transition-colors border border-slate-600"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="px-4 md:px-6 pt-4 flex flex-col gap-5">

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-surface-muted rounded-xl p-1 border border-border-light">
        {[
          { id: 'overview', icon: Activity, label: 'Overview' },
          { id: 'schools', icon: School, label: 'Schools' },
          { id: 'members', icon: UserCog, label: 'Member Override' },
          { id: 'data', icon: Table, label: 'Spreadsheet' },
          { id: 'flags', icon: Settings, label: 'Feature Flags' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); if (tab.id === 'data' && !sheetData) loadSheetData(selectedSheet); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-bold transition-all whitespace-nowrap flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-surface-default text-ink-title shadow-sm'
                : 'text-ink-muted hover:text-ink-title'
            }`}
          >
            <tab.icon size={16} /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
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

        {/* ============ OVERVIEW TAB ============ */}
        {activeTab === 'overview' && (
          <>
            
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
                        <div className="flex items-center justify-between -mb-4 relative z-10">
                            <label className="text-sm font-semibold text-ink-muted pl-1">1. Target Organization / School</label>
                            <Button variant="ghost" size="sm" onClick={loadOverview} className="h-6 text-[10px] px-2 gap-1 text-brand-600 hover:bg-brand-50" title="Refresh network node list">
                                <RefreshCw size={12} /> Sync
                            </Button>
                        </div>
                        <Select 
                            value={impForm.schoolId}
                            onChange={(e) => setImpForm(p => ({...p, schoolId: e.target.value}))}
                            options={[
                                {label: 'Select Database Namespace...', value: ''},
                                ...schoolsList.map(s => ({label: Math.max(0, s.name.length) ? s.name + (s.short_code ? ' (' + s.short_code + ')' : '') : s.name, value: s.id}))
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

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard icon={School} label="Schools" value={overviewData?.totalSchools || 0} color="#2563EB" />
              <KPICard icon={Users} label="Members" value={overviewData?.totalMembers || 0} color="#16A34A" />
              <KPICard icon={AlertTriangle} label="Open Tickets" value={overviewData?.openTickets || 0} color={overviewData?.escalatedTickets > 0 ? '#DC2626' : '#F59E0B'} />
              <KPICard icon={FileText} label="Pending Posts" value={overviewData?.pendingPosts || 0} color="#7C3AED" />
            </div>

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

        {/* ============ SCHOOLS TAB ============ */}
        {activeTab === 'schools' && (
          <>
            <Card className="border border-border-light shadow-social-card">
              <div className="flex items-center justify-between border-b border-border-light pb-3 mb-3">
                <h2 className="text-[16px] font-bold text-ink-title m-0 flex items-center gap-2">
                  <School size={18} className="text-brand-500" /> Schools Registry
                </h2>
                <div className="flex items-center gap-2">
                  <Badge colorHex="#dcfce7" textHex="#16a34a" className="font-bold border border-green-200">
                    {overviewData?.totalSchools || 0} Active
                  </Badge>
                  <Button size="sm" className="font-bold shadow-sm flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 border-none" onClick={() => setIsAddSchoolOpen(true)}>
                    <School size={14} /> Add School
                  </Button>
                </div>
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
                      <div className="flex items-center gap-2">
                        <Badge
                          colorHex={s.status === 'Active' || s.status === 'Approved' ? '#dcfce7' : '#fef3c7'}
                          textHex={s.status === 'Active' || s.status === 'Approved' ? '#16a34a' : '#b45309'}
                          className="font-bold border uppercase text-[10px] tracking-widest"
                        >
                          {s.status}
                        </Badge>
                        <button
                          onClick={() => handleRemoveSchool(s.id, s.name)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove School"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-ink-muted text-[13px]">No schools onboarded yet.</div>
              )}
            </Card>
          </>
        )}

        {/* ============ MEMBER OVERRIDE TAB ============ */}
        {activeTab === 'members' && (
          <>
            <Card className="border border-border-light shadow-social-card">
              <div className="flex items-center justify-between border-b border-border-light pb-3 mb-4">
                <h2 className="text-[16px] font-bold text-ink-title m-0 flex items-center gap-2">
                  <UserCog size={18} className="text-amber-500" /> Global Member Override
                </h2>
              </div>
              <p className="text-[13px] text-ink-muted mb-4 leading-relaxed">
                Search any member across all schools by name or email. Override their role, verification status, year group, or any other identity field.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  className="social-input flex-1"
                  placeholder="Search by name, email, or ID..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchMembers()}
                />
                <Button onClick={searchMembers} disabled={memberSearchLoading} className="shrink-0 flex items-center gap-2">
                  <Search size={16} /> {memberSearchLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {memberResults.length > 0 && (
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  {memberResults.map(m => (
                    <div key={m.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${overrideTarget?.id === m.id ? 'bg-amber-50 border-amber-300' : 'bg-surface-muted border-border-light hover:border-brand-300'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0" style={{ backgroundColor: m.cheque_colour || '#8A8D91' }}>
                          {(m.name || '?').charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-bold text-ink-title truncate">{m.name}</span>
                          <span className="text-[11px] text-ink-muted truncate">{m.email} • {m.role} • {m.school}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setOverrideTarget(overrideTarget?.id === m.id ? null : m)}
                        className={`p-2 rounded-lg transition-colors shrink-0 ${overrideTarget?.id === m.id ? 'bg-amber-500 text-white' : 'bg-surface-default text-ink-muted hover:text-ink-title border border-border-light'}`}
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Override Form */}
              {overrideTarget && (
                <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="text-[14px] font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <Shield size={16} /> Override: {overrideTarget.name}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[12px] font-bold text-amber-700 mb-1">Field</label>
                      <select className="social-input text-[13px]" value={overrideField} onChange={e => setOverrideField(e.target.value)}>
                        <option value="role">Role</option>
                        <option value="verification_status">Verification Status</option>
                        <option value="email_verified">Email Verified</option>
                        <option value="id_verified">ID Verified</option>
                        <option value="year_group_id">Year Group ID</option>
                        <option value="year_group_nickname">Year Group Nickname</option>
                        <option value="school">School</option>
                        <option value="name">Name</option>
                        <option value="email">Email</option>
                        <option value="house_name">House</option>
                        <option value="final_class">Class</option>
                        <option value="gender">Gender</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-amber-700 mb-1">New Value</label>
                      <input className="social-input text-[13px]" placeholder="Enter new value..." value={overrideValue} onChange={e => setOverrideValue(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleOverride} disabled={overriding} className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none flex items-center justify-center gap-2">
                        <Power size={14} /> {overriding ? 'Applying...' : 'Apply Override'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {/* ============ SPREADSHEET TAB ============ */}
        {activeTab === 'data' && (
          <>
            <Card className="border border-border-light shadow-social-card">
              <div className="flex items-center justify-between border-b border-border-light pb-3 mb-3">
                <h2 className="text-[16px] font-bold text-ink-title m-0 flex items-center gap-2">
                  <Database size={18} className="text-emerald-500" /> Raw Spreadsheet Access
                </h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <select
                  className="social-input text-[13px] font-bold sm:w-48"
                  value={selectedSheet}
                  onChange={e => { setSelectedSheet(e.target.value); loadSheetData(e.target.value); }}
                >
                  {SHEETS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  className="social-input flex-1 text-[13px]"
                  placeholder="Filter rows..."
                  value={sheetSearch}
                  onChange={e => setSheetSearch(e.target.value)}
                />
                <Button size="sm" onClick={() => loadSheetData(selectedSheet)} disabled={sheetLoading} className="shrink-0 flex items-center gap-1.5">
                  <RefreshCw size={14} className={sheetLoading ? 'animate-spin' : ''} /> Reload
                </Button>
              </div>

              {sheetLoading ? (
                <div className="animate-pulse h-40 bg-surface-muted rounded-xl border border-border-light" />
              ) : sheetData ? (
                <div className="overflow-x-auto rounded-xl border border-border-light">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="border-b border-border-light bg-surface-muted">
                        <th className="py-2 px-2 font-bold text-ink-muted text-[10px] uppercase tracking-wider sticky left-0 bg-surface-muted z-10">#</th>
                        {sheetData.headers?.filter(h => h !== '_rowIndex').slice(0, 10).map(h => (
                          <th key={h} className="py-2 px-2 font-bold text-ink-muted text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-ink-body">
                      {(sheetData.rows || [])
                        .filter(row => {
                          if (!sheetSearch) return true;
                          const s = sheetSearch.toLowerCase();
                          return Object.values(row).some(v => String(v).toLowerCase().includes(s));
                        })
                        .slice(0, 50)
                        .map((row, idx) => (
                        <tr key={idx} className="border-b border-border-light/50 hover:bg-surface-hover transition-colors">
                          <td className="py-2 px-2 text-ink-muted font-mono text-[10px] sticky left-0 bg-surface-default">{row._rowIndex}</td>
                          {sheetData.headers?.filter(h => h !== '_rowIndex').slice(0, 10).map(h => (
                            <td key={h} className="py-2 px-2 max-w-[180px] truncate whitespace-nowrap cursor-pointer hover:bg-brand-50 transition-colors"
                              onClick={() => setEditingCell({ rowIndex: row._rowIndex, col: h, value: String(row[h] || '') })}
                              title={`Click to edit: ${h} = ${row[h]}`}
                            >
                              {String(row[h] || '').substring(0, 50)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-2 text-[11px] text-ink-muted bg-surface-muted border-t border-border-light">
                    Showing up to 50 / {sheetData.totalRows} rows • {sheetData.headers?.length} columns • Click any cell to edit
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-ink-muted text-[13px]">Select a sheet and load data</div>
              )}
            </Card>

            {/* Cell Edit Modal */}
            <Modal isOpen={!!editingCell} onClose={() => setEditingCell(null)} title="Edit Cell">
              {editingCell && (
                <div className="flex flex-col gap-4 mt-2">
                  <div className="p-3 bg-surface-muted rounded-lg border border-border-light text-[13px]">
                    <strong>Sheet:</strong> {selectedSheet} &nbsp;•&nbsp;
                    <strong>Row:</strong> {editingCell.rowIndex} &nbsp;•&nbsp;
                    <strong>Column:</strong> {editingCell.col}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-ink-title mb-1.5">New Value</label>
                    <textarea
                      className="social-textarea min-h-[80px] text-[13px]"
                      value={editingCell.value}
                      onChange={e => setEditingCell({ ...editingCell, value: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEditingCell(null)}>Cancel</Button>
                    <Button onClick={handleCellEdit} className="flex items-center gap-2"><Save size={14} /> Save</Button>
                  </div>
                </div>
              )}
            </Modal>
          </>
        )}

        {/* ============ FEATURE FLAGS TAB ============ */}
        {activeTab === 'flags' && (
          <>
            <Card className="border border-border-light shadow-social-card">
              <div className="flex items-center justify-between border-b border-border-light pb-3 mb-4">
                <h2 className="text-[16px] font-bold text-ink-title m-0 flex items-center gap-2">
                  <Settings size={18} className="text-ink-muted" /> Feature Flags
                </h2>
                <Button size="sm" onClick={handleSaveFlags} disabled={savingFlags} className="flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 border-none font-bold shadow-sm">
                  <Save size={14} /> {savingFlags ? 'Saving...' : 'Save to Backend'}
                </Button>
              </div>
              <p className="text-[13px] text-ink-muted mb-4 leading-relaxed">
                Toggle platform-wide modules on/off. Changes are persisted server-side and affect all users.
              </p>
              <div className="flex flex-col gap-2">
                <FeatureToggle label="Fundraising Module" desc="Enable the fundraising campaigns module for all schools" enabled={features.fundraising} onClick={() => setFeatures({...features, fundraising: !features.fundraising})} />
                <FeatureToggle label="Newsletters Module" desc="Enable the newsletter submission and dispatch system" enabled={features.newsletters} onClick={() => setFeatures({...features, newsletters: !features.newsletters})} />
                <FeatureToggle label="Cross-School Events" desc="Allow events to be visible across multiple school associations" enabled={features.crossSchoolEvents} onClick={() => setFeatures({...features, crossSchoolEvents: !features.crossSchoolEvents})} />
                <FeatureToggle label="Payment Gateway (v2)" desc="Enable the integrated mobile money / bank transfer payment processing" enabled={features.paymentGateway} onClick={() => setFeatures({...features, paymentGateway: !features.paymentGateway})} />
                <FeatureToggle label="Admin Approval for Registrations" desc="Require school admin approval before new members can access the platform" enabled={features.adminApproval} onClick={() => setFeatures({...features, adminApproval: !features.adminApproval})} />
              </div>
            </Card>
          </>
        )}

        </>
      )}

      </div>

      {/* ============ MODALS ============ */}

      {/* Add Staff Modal */}
      <Modal isOpen={isAddStaffOpen} onClose={() => setIsAddStaffOpen(false)} title="Add ICUNI Labs Staff">
        <form onSubmit={handleAddStaff} className="flex flex-col gap-4 mt-2">
          <p className="text-[13px] text-ink-body leading-relaxed">
            This will create a new <strong>IT Department</strong> account with full platform access. The user will be pre-verified and bypass all verification walls.
          </p>
          <Input label="Full Name" required value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="e.g. John Mensah" />
          <Input label="Email Address" type="email" required value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="e.g. john@icuni.org" />
          <Input label="Temporary Password" required value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Minimum 8 characters" />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddStaffOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={addingStaff} className="flex items-center gap-2">
              <UserPlus size={16} /> {addingStaff ? 'Creating...' : 'Add to Team'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add School Modal */}
      <Modal isOpen={isAddSchoolOpen} onClose={() => setIsAddSchoolOpen(false)} title="Onboard New School">
        <form onSubmit={handleAddSchool} className="flex flex-col gap-4 mt-2">
          <Input label="School Name" required value={newSchoolData.school_name} onChange={e => setNewSchoolData({...newSchoolData, school_name: e.target.value})} placeholder="e.g. Aggrey Memorial SHS" />
          <div className="mb-0">
            <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">School Type</label>
            <select className="social-input" value={newSchoolData.school_type} onChange={e => setNewSchoolData({...newSchoolData, school_type: e.target.value})}>
              <option value="Mixed">Mixed</option>
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
            </select>
          </div>
          <Input label="Initial Admin Name" required value={newSchoolData.admin_name} onChange={e => setNewSchoolData({...newSchoolData, admin_name: e.target.value})} placeholder="e.g. Yaw Adjei" />
          <Input label="Initial Admin Email" type="email" required value={newSchoolData.admin_email} onChange={e => setNewSchoolData({...newSchoolData, admin_email: e.target.value})} placeholder="e.g. admin@school.edu" />
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddSchoolOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submittingSchool}>{submittingSchool ? 'Registering...' : 'Register School'}</Button>
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

function FeatureToggle({ label, desc, enabled, onClick }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-surface-muted border border-border-light hover:border-brand-300 transition-colors cursor-pointer" onClick={onClick}>
       <div className="flex flex-col gap-0.5 pr-4">
         <span className="font-bold text-[14px] text-ink-title">{label}</span>
         {desc && <span className="text-[12px] text-ink-muted leading-relaxed">{desc}</span>}
       </div>
       <div className={`w-12 h-7 rounded-pill relative transition-colors shadow-inner shrink-0 ${enabled ? 'bg-brand-500' : 'bg-[#E4E6EB]'}`}>
          <div className={`absolute top-[3px] w-5.5 h-5.5 rounded-full bg-white shadow-sm transition-all duration-300 ${enabled ? 'right-[3px]' : 'left-[3px]'}`} style={{width:'21px',height:'21px'}} />
       </div>
    </div>
  );
}
