import React, { useState } from 'react';
import { Card, Button, Badge, ToggleSwitch } from '../components/ui';
import { Bell, Lock, User, Globe, Shield, Paintbrush, Monitor, Smartphone, Moon, Sun, MonitorPlay, Zap, Key, Navigation, Layout, Palette } from 'lucide-react';
import { authState } from '../api/client';
import { Link } from 'react-router-dom';

export function Settings() {
  const user = authState.getUser() || {};
  const isStaff = user?.role === "ICUNI Staff";
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance & Layout', icon: Paintbrush },
    ...(isStaff ? [{ id: 'advanced', label: 'Advanced Controls', icon: Zap }] : [])
  ];

  return (
    <div className="max-w-5xl mx-auto py-4 animate-fade-in">
       <div className="mb-8">
         <h1 className="text-2xl font-bold text-ink-title tracking-tight">Settings</h1>
         <p className="text-ink-muted mt-1 text-[14px]">Manage your account, preferences, and platform controls.</p>
       </div>

       <div className="flex flex-col md:flex-row gap-6">
          
          {/* Tab Nav */}
          <div className="w-full md:w-56 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible scrollbar-hide">
            {tabs.map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all font-medium text-left text-[13px] whitespace-nowrap ${
                   activeTab === tab.id 
                     ? 'bg-surface-default shadow-sm text-ink-title border border-border-light' 
                     : 'text-ink-muted hover:bg-surface-hover hover:text-ink-body'
                 }`}
               >
                  <tab.icon size={18} className={activeTab === tab.id ? 'text-school' : 'opacity-60'} />
                  {tab.label}
               </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
             {activeTab === 'account' && <AccountTab user={user} />}
             {activeTab === 'privacy' && <PrivacyTab />}
             {activeTab === 'notifications' && <NotificationsTab />}
             {activeTab === 'appearance' && <AppearanceTab isStaff={isStaff} />}
             {activeTab === 'advanced' && isStaff && <AdvancedTab />}
          </div>
       </div>
    </div>
  );
}

function AccountTab({ user }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="p-5">
        <h3 className="text-lg font-bold text-ink-title mb-4 tracking-tight">Profile Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoField label="Legal Name" value={user.name} />
          <InfoField label="Username" value={`@${user.username || 'unknown'}`} mono />
          <InfoField label="Registered Email" value={user.email} className="sm:col-span-2" />
        </div>
        <div className="mt-5 flex justify-end">
          <Button variant="outline" size="sm">Request Data Export</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-bold text-red-600 mb-3 tracking-tight">Danger Zone</h3>
        <p className="text-[13px] text-ink-muted mb-4">Permanently delete your account and all data. This cannot be undone.</p>
        <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20">Delete Account</Button>
      </Card>
    </div>
  );
}

function InfoField({ label, value, mono, className = '' }) {
  return (
    <div className={className}>
      <label className="text-[11px] font-semibold text-ink-muted mb-1 block uppercase tracking-wider">{label}</label>
      <div className={`p-3 bg-surface-muted rounded-xl border border-border-light text-ink-body font-medium text-[14px] ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function PrivacyTab() {
  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-school-tint">
            <Lock className="text-school" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink-title tracking-tight">Session Security</h3>
            <p className="text-[13px] text-ink-muted">Manage active logins and authentication.</p>
          </div>
        </div>
        
        <div className="border border-border-light rounded-xl overflow-hidden divide-y divide-border-light">
          <div className="p-4 flex items-center justify-between hover:bg-surface-hover transition-colors">
            <div className="flex items-center gap-3">
              <Monitor className="text-ink-muted" size={18} />
              <div>
                <p className="font-medium text-ink-body text-[13px]">Chrome Browser</p>
                <p className="text-[11px] text-ink-muted">Active now</p>
              </div>
            </div>
            <Badge colorHex="var(--school-tint)" textHex="var(--school-primary)">Current</Badge>
          </div>
          <div className="p-4 flex items-center justify-between hover:bg-surface-hover transition-colors">
            <div className="flex items-center gap-3">
              <Smartphone className="text-ink-muted" size={18} />
              <div>
                <p className="font-medium text-ink-body text-[13px]">Mobile Safari</p>
                <p className="text-[11px] text-ink-muted">Last active 2 hrs ago</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-[12px]">Revoke</Button>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border-light">
          <ToggleSwitch 
            label="Two-Factor Authentication" 
            description="Add extra security to your account." 
            checked={false} 
            onChange={() => {}} 
          />
        </div>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="p-5">
        <h3 className="text-lg font-bold text-ink-title mb-5 tracking-tight">Notification Preferences</h3>
        <div className="space-y-5">
          <ToggleSwitch label="Email Notifications" description="Receive newsletters and event reminders via email." checked={emailNotifs} onChange={setEmailNotifs} />
          <ToggleSwitch label="Push Notifications" description="Browser push notifications for urgent updates." checked={pushNotifs} onChange={setPushNotifs} />
        </div>
      </Card>
    </div>
  );
}

function AppearanceTab({ isStaff }) {
  const [theme, setTheme] = useState(() => {
    if (localStorage.theme === 'dark') return 'dark';
    if (localStorage.theme === 'light') return 'light';
    return 'system';
  });

  const [mobileNav, setMobileNav] = useState(() => localStorage.getItem('osa_mobile_nav') || 'bottom');
  const [authLayout, setAuthLayout] = useState(() => localStorage.getItem('osa_auth_layout') || 'split');

  const applyTheme = (mode) => {
    setTheme(mode);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else if (mode === 'light') {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      localStorage.removeItem('theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const applyMobileNav = (style) => {
    setMobileNav(style);
    localStorage.setItem('osa_mobile_nav', style);
  };

  const applyAuthLayout = (style) => {
    setAuthLayout(style);
    localStorage.setItem('osa_auth_layout', style);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Theme */}
      <Card className="p-5">
        <h3 className="text-lg font-bold text-ink-title mb-5 tracking-tight">Color Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          <ThemePreview mode="light" label="Light" icon={Sun} active={theme === 'light'} onClick={() => applyTheme('light')} />
          <ThemePreview mode="dark" label="Dark" icon={Moon} active={theme === 'dark'} onClick={() => applyTheme('dark')} />
          <ThemePreview mode="system" label="System" icon={MonitorPlay} active={theme === 'system'} onClick={() => applyTheme('system')} />
        </div>
      </Card>

      {/* Mobile Navigation */}
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-school-tint">
            <Navigation className="text-school" size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink-title tracking-tight">Mobile Navigation</h3>
            <p className="text-[12px] text-ink-muted">Choose your preferred navigation style on mobile.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => applyMobileNav('bottom')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mobileNav === 'bottom' ? 'border-school bg-school-tint' : 'border-border-light hover:border-ink-muted/30'}`}
          >
            <div className="w-16 h-10 bg-surface-muted rounded-lg border border-border-light relative overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-ink-muted/20 flex gap-0.5 items-center justify-center px-1">
                {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 rounded-full bg-ink-muted/60" />)}
              </div>
            </div>
            <span className="text-[12px] font-semibold text-ink-title">Bottom Tabs</span>
            <span className="text-[10px] text-ink-muted">Like Instagram/Twitter</span>
          </button>
          <button
            onClick={() => applyMobileNav('hamburger')}
            className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${mobileNav === 'hamburger' ? 'border-school bg-school-tint' : 'border-border-light hover:border-ink-muted/30'}`}
          >
            <div className="w-16 h-10 bg-surface-muted rounded-lg border border-border-light relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-ink-muted/20 flex items-center justify-end px-1">
                <div className="flex flex-col gap-[1px]">
                  {[1,2,3].map(i => <div key={i} className="w-2 h-[1px] bg-ink-muted/60" />)}
                </div>
              </div>
            </div>
            <span className="text-[12px] font-semibold text-ink-title">Hamburger Menu</span>
            <span className="text-[10px] text-ink-muted">Classic dropdown</span>
          </button>
        </div>
      </Card>

      {/* Auth Layout (Staff only) */}
      {isStaff && (
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-school-tint">
              <Layout className="text-school" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-title tracking-tight">Login Page Layout</h3>
              <p className="text-[12px] text-ink-muted">Change the login/register page design for all users.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => applyAuthLayout('split')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${authLayout === 'split' ? 'border-school bg-school-tint' : 'border-border-light hover:border-ink-muted/30'}`}
            >
              <div className="w-16 h-10 bg-surface-muted rounded-lg border border-border-light flex overflow-hidden">
                <div className="w-1/2 h-full" style={{ background: 'linear-gradient(135deg, var(--school-primary), var(--school-secondary))' }} />
                <div className="w-1/2 h-full bg-white dark:bg-slate-800 flex items-center justify-center">
                  <div className="w-4 h-5 border border-border-light rounded" />
                </div>
              </div>
              <span className="text-[12px] font-semibold text-ink-title">Split Screen</span>
            </button>
            <button
              onClick={() => applyAuthLayout('centered')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${authLayout === 'centered' ? 'border-school bg-school-tint' : 'border-border-light hover:border-ink-muted/30'}`}
            >
              <div className="w-16 h-10 bg-surface-muted rounded-lg border border-border-light flex items-center justify-center">
                <div className="w-6 h-7 border border-border-light rounded bg-white dark:bg-slate-800" />
              </div>
              <span className="text-[12px] font-semibold text-ink-title">Centered</span>
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

function ThemePreview({ mode, label, icon: Icon, active, onClick }) {
  const bgClass = mode === 'dark' ? 'bg-slate-900 border-slate-700' : mode === 'light' ? 'bg-white' : 'bg-surface-muted';
  
  return (
    <button 
      onClick={onClick}
      className={`rounded-xl p-3 flex flex-col items-center gap-2 border-2 transition-all ${
        active ? 'border-school shadow-sm bg-school-tint' : 'border-border-light hover:border-ink-muted/30'
      }`}
    >
      <div className={`w-full h-8 rounded-lg border border-border-light ${bgClass} flex flex-col p-1 gap-0.5`}>
        <div className={`h-1 w-full rounded-sm ${mode === 'dark' ? 'bg-slate-600' : 'bg-slate-200'}`} />
        <div className={`h-1 w-3/4 rounded-sm ${mode === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`} />
      </div>
      <span className="font-semibold text-[12px] text-ink-title flex items-center gap-1.5">
        <Icon size={14} /> {label}
      </span>
    </button>
  );
}

function AdvancedTab() {
  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="p-5 border-amber-200 dark:border-amber-800" style={{ background: 'linear-gradient(135deg, #0F172A, #1E293B)' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
            <Key className="text-amber-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">ICUNI Operations Cockpit</h3>
            <p className="text-[12px] text-slate-400">Global tenant management and architecture controls.</p>
          </div>
        </div>
        
        <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-700/50 mb-5">
          <p className="text-slate-300 text-[13px] leading-relaxed mb-4">
            Access the supreme dashboard to monitor tenant bandwidth, impersonate any user, and regenerate schema primitives.
          </p>
          <Link to="/app/cockpit">
            <Button className="w-full !bg-amber-500 hover:!bg-amber-600 !text-slate-950 font-bold border-none">
              Launch Cockpit
            </Button>
          </Link>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-700/50">
          <ToggleSwitch label="Bypass API Caching" description="Forces immediate fresh reads." checked={true} onChange={() => {}} />
          <ToggleSwitch label="Inspect Request Payloads" description="Logs every API slice to console." checked={false} onChange={() => {}} />
        </div>
      </Card>
    </div>
  );
}
