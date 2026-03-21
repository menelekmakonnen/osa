import React, { useState } from 'react';
import { Card, Button, Input } from '../components/ui';
import { Mail, ShieldCheck, UploadCloud, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { authState } from '../api/client';
import { Logo } from '../components/Logo';

export function VerificationWall({ user, isSuperAdmin }) {
  const [activeTab, setActiveTab] = useState('email');
  const [proofOfName, setProofOfName] = useState(null);
  const [proofOfAddress, setProofOfAddress] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // If regular user and email is verified, they shouldn't be here, but just in case
  const needsEmailVerify = !user.email_verified;
  const needsIdVerify = isSuperAdmin && !user.id_verified;

  const handleLogout = () => {
    authState.clearSession();
    window.location.href = '/login';
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (!proofOfName || !proofOfAddress) return;
    setSubmitting(true);
    // Mock upload delay
    setTimeout(() => {
        setSubmitting(false);
        setSubmitted(true);
    }, 2000);
  };

  const handleResendEmail = () => {
     alert("Verification email resent to " + user.email);
  };

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <Logo className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-3xl font-extrabold text-ink-title">Security Checkpoint</h2>
        <p className="mt-2 text-ink-body max-w-md">
          {isSuperAdmin ? "Super Admin accounts require extra verification." : "Please verify your email to access the portal."}
        </p>
      </div>

      <div className="w-full max-w-2xl bg-surface-default shadow-social-card rounded-2xl overflow-hidden border border-border-light relative">
         
         {/* Sidebar / Tabs (Desktop) */}
         <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 bg-surface-muted border-b md:border-b-0 md:border-r border-border-light p-6 flex gap-4 md:flex-col justify-start overflow-x-auto">
               <button 
                  onClick={() => setActiveTab('email')}
                  className={`flex flex-col md:flex-row items-center gap-3 p-3 rounded-xl transition-colors text-left font-semibold ${activeTab === 'email' ? 'bg-white shadow-sm text-brand-600' : 'text-ink-muted hover:bg-surface-hover'}`}
               >
                  <Mail size={24} className={activeTab === 'email' ? 'text-brand-500' : ''} />
                  <span className="text-sm">Email Address</span>
                  {!needsEmailVerify && <CheckCircle2 size={16} className="text-green-500 ml-auto hidden md:block" />}
               </button>
               {needsIdVerify && (
                  <button 
                     onClick={() => !needsEmailVerify && setActiveTab('id')}
                     disabled={needsEmailVerify}
                     className={`flex flex-col md:flex-row items-center gap-3 p-3 rounded-xl transition-colors text-left font-semibold ${activeTab === 'id' ? 'bg-white shadow-sm text-amber-600' : 'text-ink-muted hover:bg-surface-hover'} ${needsEmailVerify ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                     <ShieldCheck size={24} className={activeTab === 'id' ? 'text-amber-500' : ''} />
                     <span className="text-sm">ID Documents</span>
                     {submitted && <CheckCircle2 size={16} className="text-green-500 ml-auto hidden md:block" />}
                  </button>
               )}
            </div>

            <div className="w-full md:w-2/3 p-6 md:p-8 min-h-[400px] flex flex-col">
               {activeTab === 'email' && (
                 <div className="flex flex-col items-center justify-center text-center h-full gap-5 animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center mb-2 shadow-sm">
                       <Mail size={40} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-ink-title">Verify Your Email</h3>
                    <p className="text-ink-body text-sm px-4">
                       We've sent a verification link to <strong className="text-ink-title">{user.email}</strong>. Please check your inbox and click the link to continue.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 w-full max-w-xs">
                       <Button onClick={handleResendEmail} className="w-full font-bold shadow-sm">Resend Link</Button>
                       {isSuperAdmin && !needsEmailVerify && (
                          <Button variant="outline" onClick={() => setActiveTab('id')} className="w-full font-bold border-brand-200 text-brand-600">Proceed to ID Check →</Button>
                       )}
                    </div>
                 </div>
               )}

               {activeTab === 'id' && (
                 <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                       <ShieldCheck className="text-amber-500" size={32} />
                       <div>
                         <h3 className="text-xl font-bold text-ink-title leading-tight">Identity Verification</h3>
                         <p className="text-[13px] text-ink-muted mt-0.5">Mandatory for Super Admin accounts.</p>
                       </div>
                    </div>

                    {!submitted ? (
                       <form onSubmit={handleUpload} className="flex flex-col gap-5 flex-1">
                          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
                             <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                             <p className="text-sm text-amber-800 leading-relaxed font-medium">
                                To protect platform integrity, we require clear, high-resolution scans or photos of your identification documents.
                             </p>
                          </div>

                          <div className="flex flex-col gap-4">
                             <div>
                                <label className="block text-sm font-bold text-ink-title mb-1.5 flex justify-between">
                                  Proof of Name (ID) <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-ink-muted mb-2">Passport, National ID, or Driver's License</p>
                                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border-light rounded-xl hover:border-brand-400 hover:bg-surface-hover transition-colors cursor-pointer group">
                                   <div className="flex flex-col items-center">
                                      <UploadCloud size={24} className="text-ink-muted group-hover:text-brand-500 transition-colors mb-2" />
                                      <span className="text-sm font-semibold text-ink-muted group-hover:text-brand-600">{proofOfName ? proofOfName.name : "Click to select file"}</span>
                                   </div>
                                   <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setProofOfName(e.target.files[0])} />
                                </label>
                             </div>

                             <div>
                                <label className="block text-sm font-bold text-ink-title mb-1.5 flex justify-between">
                                  Proof of Address <span className="text-red-500">*</span>
                                </label>
                                <p className="text-xs text-ink-muted mb-2">Utility bill or bank statement (within 3 months)</p>
                                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border-light rounded-xl hover:border-brand-400 hover:bg-surface-hover transition-colors cursor-pointer group">
                                   <div className="flex flex-col items-center">
                                      <UploadCloud size={24} className="text-ink-muted group-hover:text-amber-500 transition-colors mb-2" />
                                      <span className="text-sm font-semibold text-ink-muted group-hover:text-amber-600">{proofOfAddress ? proofOfAddress.name : "Click to select file"}</span>
                                   </div>
                                   <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => setProofOfAddress(e.target.files[0])} />
                                </label>
                             </div>
                          </div>

                          <Button type="submit" disabled={!proofOfName || !proofOfAddress || submitting} className="w-full mt-auto py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm">
                             {submitting ? 'Uploading Documents...' : 'Submit Securely'}
                          </Button>
                       </form>
                    ) : (
                       <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-2">
                             <CheckCircle2 size={40} strokeWidth={2} />
                          </div>
                          <h3 className="text-xl font-bold text-ink-title">Documents Under Review</h3>
                          <p className="text-ink-body text-sm px-4">
                             Thank you. ICUNI Labs is currently reviewing your Identity Verification documents. You will receive an email once your Super Admin status is fully approved.
                          </p>
                          <Button variant="secondary" onClick={handleLogout} className="mt-4">
                             Log Out
                          </Button>
                       </div>
                    )}
                 </div>
               )}
            </div>
         </div>
      </div>
      
      <div className="mt-8 text-center">
         <button onClick={handleLogout} className="text-ink-muted hover:text-ink-title text-sm font-semibold flex items-center gap-2 justify-center transition-colors">
            <LogOut size={16} /> Sign out for now
         </button>
      </div>
    </div>
  );
}
