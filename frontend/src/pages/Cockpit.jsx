import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Badge } from '../components/ui';
import { Globe, Users, ShieldAlert, Zap, X, Search, Terminal, School, Building2, Fingerprint } from 'lucide-react';
import { authState, api } from '../api/client';
import toast from 'react-hot-toast';

export function Cockpit() {
   const user = authState.getUser();
   const isStaff = user?.role === "ICUNI Staff" || user?.role === "ICUNI Staff";
   
   const [schools, setSchools] = useState([]);
   const [loading, setLoading] = useState(true);
   const [activeImp, setActiveImp] = useState(null);

   const [impForm, setImpForm] = useState({
       schoolId: '',
       role: 'School Administrator'
   });

   useEffect(() => {
       const init = async () => {
           try {
               const imp = api.getImpersonation();
               setActiveImp(imp);
               
               const res = await api.getSchools();
               setSchools(res.data || []);
           } catch(e) {
               console.error("Failed to load cockpit data", e);
               toast.error("Failed to sync global topology");
           } finally {
               setLoading(false);
           }
       };
       init();
   }, []);

   if (!isStaff) {
       return <div className="p-8 text-center text-red-500 font-bold">UNAUTHORIZED ACCESS: CLEARANCE TIER 5 REQUIRED.</div>;
   }

   const handleEngage = () => {
       if (!impForm.schoolId) {
           toast.error("Select a target tenant database.");
           return;
       }
       toast.loading("Engaging Impersonation Context...");
       api.setImpersonation(impForm.schoolId, impForm.role);
   };

   return (
       <div className="max-w-6xl mx-auto py-6 animate-fade-in font-sans">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-900 border border-slate-700 text-white p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950">
                      <Terminal size={28} strokeWidth={2.5} />
                  </div>
                  <div>
                      <h1 className="text-3xl font-heading font-black tracking-tight text-white flex items-center gap-3">
                          ICUNI COCKPIT
                          <Badge text="TIER 5" color="yellow" className="bg-amber-400 text-slate-900 border-none shadow-sm" />
                      </h1>
                      <p className="text-amber-200/80 font-medium">Global Network Control & Routing Operations</p>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Context Simulator Module */}
              <div className="lg:col-span-2 space-y-6">
                  <Card className="p-8 border-2 border-brand-200 shadow-md">
                      <div className="flex items-start justify-between mb-8">
                          <div>
                              <h3 className="text-xl font-bold flex items-center gap-2 text-brand-900">
                                  <Fingerprint className="text-brand-600" size={24} />
                                  Context Simulator
                              </h3>
                              <p className="text-brand-700/80 text-sm mt-1">Route all API transactions through an isolated school tenant mimicking standard clearance.</p>
                          </div>
                          {activeImp && (
                             <Badge text="Engaged" color="green" className="animate-pulse shadow-sm" />
                          )}
                      </div>

                      {activeImp ? (
                          <div className="bg-green-50 border border-green-200 rounded-xl p-6 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                              <h4 className="text-green-800 font-bold mb-2 tracking-wide uppercase text-xs">Active Routing Node</h4>
                              <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                                  <div>
                                      <p className="text-lg font-black text-slate-900">{schools.find(s => s.id === activeImp.target_school_id)?.name || activeImp.target_school_id}</p>
                                      <p className="text-slate-500 flex items-center gap-2 text-sm mt-1">
                                          <ShieldAlert size={14} className="text-amber-500" />
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
                              <Select 
                                  label="1. Target Organization / School"
                                  value={impForm.schoolId}
                                  onChange={(e) => setImpForm(p => ({...p, schoolId: e.target.value}))}
                                  options={[
                                      {label: "Select Database Namespace...", value: ""},
                                      ...schools.map(s => ({label: `${s.name} (${s.short_code})`, value: s.id}))
                                  ]}
                              />
                              <Select 
                                  label="2. Privilege Class"
                                  value={impForm.role}
                                  onChange={(e) => setImpForm(p => ({...p, role: e.target.value}))}
                                  options={[
                                      {label: "Member (Read-Only Layouts)", value: "Member"},
                                      {label: "Year Group Admin", value: "Year Group Admin"},
                                      {label: "School Administrator", value: "School Administrator"},
                                      {label: "Super Admin", value: "Super Admin"}
                                  ]}
                              />
                              <Button 
                                  onClick={handleEngage}
                                  disabled={loading}
                                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 text-lg shadow-xl shadow-slate-900/20 transition-transform active:scale-95"
                              >
                                  {loading ? "INITIALIZING..." : "ENGAGE SIMULATION"}
                              </Button>
                          </div>
                      )}
                  </Card>

                  {/* Provisioning Engine Placeholder */}
                  <Card className="p-6 border border-slate-200 bg-slate-50 opacity-80 cursor-not-allowed">
                       <h3 className="text-lg font-bold flex items-center gap-2 text-slate-400">
                           <Building2 size={20} />
                           Architecture Provisioning
                       </h3>
                       <p className="text-slate-400 text-sm mt-1 mb-4">Deploy completely new isolated tenant databases.</p>
                       <Button disabled variant="outline" className="w-full bg-transparent border-slate-300 text-slate-400">Restricted by ICUNI Group</Button>
                  </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                  <Card className="p-6 bg-surface-default shadow-sm border border-border-light">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-ink-muted mb-4 border-b border-border-light pb-2">Network Topology</h3>
                      <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                              <span className="text-ink-body font-medium flex items-center gap-2"><School size={16} className="text-brand-500" /> Total Nodes</span>
                              <span className="text-xl font-black text-ink-title">{schools.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-ink-body font-medium flex items-center gap-2"><Zap size={16} className="text-amber-500" /> Gateway Status</span>
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">OPTIMAL</span>
                          </div>
                      </div>
                  </Card>

                  <Card className="p-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-ink-muted mb-4">Master Audit Log</h3>
                      <div className="text-xs text-ink-muted font-mono space-y-3">
                         <p className="pb-3 border-b border-border-light border-dashed">
                            <span className="text-green-500 font-bold">[SYS]</span> 2026-03-27: Root Schema updated.
                         </p>
                         <p className="pb-3 border-b border-border-light border-dashed">
                            <span className="text-amber-500 font-bold">[AUTH]</span> Super Admin cleared tokens.
                         </p>
                         <p>
                            <span className="text-brand-500 font-bold">[ROUTER]</span> Handshake established.
                         </p>
                      </div>
                  </Card>
              </div>
          </div>
       </div>
   );
}
