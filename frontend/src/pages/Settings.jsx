import React, { useState } from 'react';
import { Card, Button, Badge } from '../components/ui';
import { Bell, Lock, User, Globe, Shield, Paintbrush, Monitor, Smartphone, Moon, Sun, MonitorPlay, Zap, Key } from 'lucide-react';
import { authState } from '../api/client';
import { Link } from 'react-router-dom';

export function Settings() {
  const user = authState.getUser() || {};
  const isStaff = user.role === "ICUNI Staff" || user.role === "IT Department";
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Paintbrush },
    ...(isStaff ? [{ id: 'advanced', label: 'Advanced Controls', icon: Zap }] : [])
  ];

  return (
    <div className="max-w-5xl mx-auto py-6 animate-fade-in">
       <div className="mb-8">
         <h1 className="text-3xl font-heading text-ink-title">Settings & Preferences</h1>
         <p className="text-ink-muted mt-2">Manage your account settings and platform preferences.</p>
       </div>

       <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar Nav */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            {tabs.map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left ${activeTab === tab.id ? 'bg-surface-default shadow-sm text-brand-600 border border-border-light' : 'text-ink-muted hover:bg-surface-hover hover:text-ink-body'}`}
               >
                  <tab.icon size={20} className={activeTab === tab.id ? 'text-brand-500' : 'opacity-70'} />
                  {tab.label}
               </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1">
             {activeTab === 'account' && (
                <div className="space-y-6">
                   <Card className="p-6">
                      <h3 className="text-xl font-heading text-ink-title mb-4">Profile Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <div>
                            <label className="text-sm font-semibold text-ink-muted mb-1 block">Legal Name</label>
                            <div className="p-3 bg-surface-muted rounded-lg border border-border-light text-ink-body font-medium">{user.name}</div>
                         </div>
                         <div>
                            <label className="text-sm font-semibold text-ink-muted mb-1 block">Username</label>
                            <div className="p-3 bg-surface-muted rounded-lg border border-border-light text-ink-body font-medium font-mono">@{user.username || 'unknown'}</div>
                         </div>
                         <div className="sm:col-span-2">
                            <label className="text-sm font-semibold text-ink-muted mb-1 block">Registered Email</label>
                            <div className="p-3 bg-surface-muted rounded-lg border border-border-light text-ink-body font-medium flex justify-between items-center">
                               <span>{user.email}</span>
                               <Badge text="Verified" color="green" />
                            </div>
                         </div>
                      </div>
                      <div className="mt-6 flex justify-end">
                         <Button variant="outline">Request Data Export</Button>
                      </div>
                   </Card>

                   <Card className="p-6">
                      <h3 className="text-xl font-heading text-ink-title mb-4 text-red-600">Danger Zone</h3>
                      <p className="text-sm text-ink-muted mb-4">Permanently delete your account and all associated data. This action cannot be reversed.</p>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Delete Account</Button>
                   </Card>
                </div>
             )}

             {activeTab === 'privacy' && (
                <div className="space-y-6">
                   <Card className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                         <Lock className="text-brand-500" size={24} />
                         <div>
                            <h3 className="text-xl font-heading text-ink-title">Session Security</h3>
                            <p className="text-sm text-ink-muted">Manage your active logins and authentication methods.</p>
                         </div>
                      </div>
                      
                      <div className="border border-border-light rounded-xl overflow-hidden divide-y divide-border-light">
                         <div className="p-4 flex items-center justify-between bg-surface-default hover:bg-surface-hover transition-colors">
                            <div className="flex items-center gap-3">
                               <Monitor className="text-ink-muted" size={20} />
                               <div>
                                  <p className="font-semibold text-ink-body text-sm">MacBook Pro (Chrome)</p>
                                  <p className="text-xs text-ink-muted">Active now • Accra, Ghana</p>
                               </div>
                            </div>
                            <Badge text="Current Session" color="green" />
                         </div>
                         <div className="p-4 flex items-center justify-between bg-surface-default hover:bg-surface-hover transition-colors">
                            <div className="flex items-center gap-3">
                               <Smartphone className="text-ink-muted" size={20} />
                               <div>
                                  <p className="font-semibold text-ink-body text-sm">iPhone 14 Pro (Safari)</p>
                                  <p className="text-xs text-ink-muted">Last active 2 hrs ago • Cape Coast, Ghana</p>
                               </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">Revoke</Button>
                         </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-border-light flex justify-between items-center">
                         <div>
                            <p className="font-semibold text-ink-title">Two-Factor Authentication</p>
                            <p className="text-sm text-ink-muted">Add an extra layer of security to your account.</p>
                         </div>
                         <Button variant="outline">Enable 2FA</Button>
                      </div>
                   </Card>
                </div>
             )}

             {activeTab === 'appearance' && (
                <div className="space-y-6">
                   <Card className="p-6">
                      <h3 className="text-xl font-heading text-ink-title mb-6">Theme Preference</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         {/* Light Mode */}
                         <button className="border-2 border-border-light rounded-xl p-4 flex flex-col items-center gap-3 hover:border-brand-300 focus:border-brand-500 transition-colors bg-white">
                             <div className="w-16 h-12 bg-slate-100 rounded-md border border-slate-200 flex flex-col p-1 gap-1">
                                <div className="h-2 w-full bg-slate-300 rounded-sm"></div>
                                <div className="h-full w-full bg-white rounded-sm border border-slate-200"></div>
                             </div>
                             <span className="font-semibold text-sm text-slate-800 flex items-center gap-2"><Sun size={14}/> Light</span>
                         </button>

                         {/* Dark Mode */}
                         <button className="border-2 border-transparent ring-2 ring-brand-500 bg-slate-900 rounded-xl p-4 flex flex-col items-center gap-3 transition-colors">
                             <div className="w-16 h-12 bg-slate-800 rounded-md border border-slate-700 flex flex-col p-1 gap-1">
                                <div className="h-2 w-full bg-slate-600 rounded-sm"></div>
                                <div className="h-full w-full bg-slate-900 rounded-sm border border-slate-700"></div>
                             </div>
                             <span className="font-semibold text-sm text-white flex items-center gap-2"><Moon size={14}/> Dark</span>
                         </button>

                         {/* System Mode */}
                         <button className="border-2 border-border-light rounded-xl p-4 flex flex-col items-center gap-3 hover:border-brand-300 transition-colors bg-surface-muted">
                             <div className="w-16 h-12 flex relative">
                                <div className="absolute inset-0 right-1/2 bg-slate-100 rounded-l-md border-y border-l border-slate-200 overflow-hidden flex flex-col p-1 gap-1">
                                   <div className="h-2 w-full bg-slate-300 rounded-sm"></div>
                                </div>
                                <div className="absolute inset-0 left-1/2 bg-slate-800 rounded-r-md border-y border-r border-slate-700 overflow-hidden flex flex-col p-1 gap-1">
                                   <div className="h-2 w-full bg-slate-600 rounded-sm"></div>
                                </div>
                             </div>
                             <span className="font-semibold text-sm text-ink-body flex items-center gap-2"><MonitorPlay size={14}/> System Match</span>
                         </button>
                      </div>
                   </Card>
                </div>
             )}

             {activeTab === 'advanced' && isStaff && (
                <div className="space-y-6">
                   <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white shadow-2xl">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                            <Key className="text-amber-400" size={24} />
                         </div>
                         <div>
                            <h3 className="text-2xl font-heading text-white">ICUNI Operations Cockpit</h3>
                            <p className="text-sm text-slate-300">Global tenant management and architecture controls.</p>
                         </div>
                      </div>
                      
                      <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-700/50 mb-6">
                         <p className="text-slate-300 text-sm leading-relaxed mb-4">
                            Access the supreme dashboard to monitor tenant bandwidth, impersonate any user across any isolated school database, and forcefully regenerate schema primitives.
                         </p>
                         <Link to="/app/cockpit">
                            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-none">Launch Cockpit Initialization</Button>
                         </Link>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-700/50">
                         <div className="flex items-center justify-between">
                            <div>
                               <p className="font-semibold">Bypass API Caching</p>
                               <p className="text-xs text-slate-400">Forces immediate fresh reads from target databases.</p>
                            </div>
                            <div className="w-12 h-6 bg-amber-500 rounded-full relative cursor-pointer">
                               <div className="absolute right-1 top-1 bottom-1 w-4 bg-slate-900 rounded-full shadow-sm"></div>
                            </div>
                         </div>
                         <div className="flex items-center justify-between">
                            <div>
                               <p className="font-semibold">Inspect Request Payloads</p>
                               <p className="text-xs text-slate-400">Logs every exact multi-tenant API slice to console.</p>
                            </div>
                            <div className="w-12 h-6 bg-slate-700 rounded-full relative cursor-pointer">
                               <div className="absolute left-1 top-1 bottom-1 w-4 bg-slate-400 rounded-full shadow-sm"></div>
                            </div>
                         </div>
                      </div>
                   </Card>
                </div>
             )}

          </div>
       </div>
    </div>
  );
}
