import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, Select, Input, Switch, ChequeChip } from '../components/ui';
import { api, authState } from '../api/client';
import { ShieldCheck, UserPlus, Users, Link as LinkIcon, Settings, Target, Camera, Key, ImageIcon, Shield, Mail, Heart, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { ProfileCropper } from '../components/ImageUpload';

const getRolesForScope = (scopeType) => {
   const prefixes = {
      'yeargroup': 'YG',
      'club': 'Club',
      'house': 'House',
      'school': 'School',
      'all': 'Platform'
   };
   const pfx = prefixes[scopeType] || 'YG';
   return [
      { value: '', label: 'Select a Role...' },
      { value: 'Member', label: 'Member (Revoke Exec)' },
      { value: `${pfx} President`, label: `${pfx} President` },
      { value: `${pfx} Vice President`, label: `${pfx} Vice President` },
      { value: `${pfx} Gen. Secretary`, label: `${pfx} Gen. Secretary` },
      { value: `${pfx} Organiser`, label: `${pfx} Organiser` },
      { value: `${pfx} Finance Exec`, label: `${pfx} Finance Exec` }
   ];
};

export function Admin() {
  const user = authState.getUser();
  const { activeScope } = useTenant();
  const isExec = user?.role?.includes("Admin") || user?.role?.includes("President") || user?.role === "IT Department";

  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // Group Avatar Upload State
  const [avatarImage, setAvatarImage] = useState(null);
  const avatarInputRef = React.useRef(null);

  // Social Links Setup
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [socialSettings, setSocialSettings] = useState({});
  const [savingSocials, setSavingSocials] = useState(false);
  const [loadingSocials, setLoadingSocials] = useState(false);
  const [inputKey, setInputKey] = useState(Date.now());

  useEffect(() => {
    if (isRolesModalOpen) {
       setLoadingMembers(true);
       api.getMembers(activeScope).then(res => {
          setMembers(res || []);
       }).catch(err => {
          console.error("Failed to load members for roles", err);
       }).finally(() => {
          setLoadingMembers(false);
       });
    }

    if (isSocialModalOpen) {
       setLoadingSocials(true);
       api.getGroupSettings(activeScope).then(res => {
          setSocialSettings(res || {});
       }).catch(err => {
          console.error("Failed to load socials", err);
       }).finally(() => {
          setLoadingSocials(false);
       });
    }
  }, [isRolesModalOpen, isSocialModalOpen, activeScope]);

  const handleAssignRole = async (e) => {
    e.preventDefault();
    setAssigning(true);
    try {
       const res = await api.assignRole(targetUserId, targetRole);
       if (res.error) throw new Error(res.error);
       toast.success("Role successfully pushed to member!");
       setIsRolesModalOpen(false);
       setTargetUserId('');
       setTargetRole('');
    } catch(err) {
       toast.error("Failed to assign role: " + err.message);
    } finally {
       setAssigning(false);
    }
  };

  const handleSaveSocials = async (e) => {
    e.preventDefault();
    setSavingSocials(true);
    try {
       await api.saveGroupSettings(activeScope, socialSettings);
       toast.success("Social Links successfully saved!");
       setIsSocialModalOpen(false);
    } catch(err) {
       toast.error("Failed to save links: " + err.message);
    } finally {
       setSavingSocials(false);
    }
  };

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setAvatarImage(reader.result));
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleAvatarCropComplete = async (base64Img) => {
    setAvatarImage(null);
    setAssigning(true); // Reuse assigning state for loading indicator
    try {
      const result = await api.uploadImage({
          group_id: "group_avatars",
          scope_type: activeScope.type,
          scope_id: activeScope.id,
          image_base64: base64Img,
          file_name: `avatar_${activeScope.id}.jpg`
      });
      await api.updateGroupAvatar({
         scope_type: activeScope.type,
         scope_id: activeScope.id,
         url: result.url
      });
      if (activeScope.type === 'school') {
         const updatedUser = { ...authState.getUser(), school_logo: result.url };
         authState.setSession(updatedUser, window.localStorage.getItem('osa_session_token'));
         setTimeout(() => window.location.reload(), 1500);
      }
      toast.success("Group profile picture updated successfully!");
    } catch(err) {
      console.error(err);
      toast.error("Failed to upload group profile picture.");
    } finally {
      setAssigning(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  if (!isExec) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const roleOptions = getRolesForScope(activeScope.type);
  const memberOptions = [
    { value: '', label: 'Search for a member...' },
    ...members.map(m => ({ value: m.id, label: `${m.name} (${m.role})` }))
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[800px] mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-bold text-ink-title m-0 flex items-center gap-3">
           <Shield className="text-brand-500" size={28} strokeWidth={2.5}/> Admin Panel
        </h1>
        <p className="text-[14px] text-ink-muted">Manage backend operations and assignments for {activeScope.label}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Newsletter Management */}
        <Card className="flex flex-col gap-4 border border-border-light shadow-social-card hover:border-brand-300 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 m-0"><Mail className="text-brand-500" size={22} strokeWidth={2.5}/> Newsletter</h2>
              <Badge colorHex="#fef3c7" textHex="#b45309" className="font-bold border border-amber-200">Action Required</Badge>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Review pending posts from members. Only approved posts will be included in the monthly dispatch.
           </p>
           <div className="flex justify-between items-center mt-auto pt-2">
             <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">{new Date().toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}</span>
             <Button size="sm" onClick={() => window.location.href='/app/newsletter'} className="font-bold shadow-sm">Go to Queue</Button>
           </div>
        </Card>

        {/* Campaign Management */}
        <Card className="flex flex-col gap-4 border border-border-light shadow-social-card hover:border-red-300 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 m-0"><Heart className="text-red-500" size={22} strokeWidth={2.5}/> Fundraising</h2>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Create emergency relief efforts or long-term school support campaigns. Track donations and post updates.
           </p>
           <div className="flex justify-between items-center mt-auto pt-2 gap-2">
             <Button size="sm" variant="secondary" onClick={() => toast.success("Fundraising module is currently undergoing active construction.")} className="flex-1 font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title">Create New</Button>
             <Button size="sm" variant="ghost" onClick={() => toast.success("Fundraising module is currently undergoing active construction.")} className="font-bold text-ink-muted hover:text-ink-title px-2">Manage</Button>
           </div>
        </Card>

         {/* Roles & Members Management */}
        <Card className="flex flex-col gap-4 border border-border-light shadow-social-card hover:border-amber-300 transition-colors">
           <div className="flex items-center justify-between border-b border-border-light pb-3">
              <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 m-0"><Shield className="text-amber-500" size={22} strokeWidth={2.5}/> Governance</h2>
           </div>
           <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
             Assign roles to members within your jurisdiction (e.g. Vice President, Organiser). Manage member status.
           </p>
           <div className="flex justify-between items-center mt-auto pt-2 gap-2">
             <Button size="sm" variant="secondary" onClick={() => setIsRolesModalOpen(true)} className="flex-1 font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title">Roles</Button>
             <Button size="sm" variant="ghost" onClick={() => window.location.href='/app/directory'} className="font-bold text-ink-muted hover:text-ink-title px-2">Members</Button>
           </div>
        </Card>

        {/* Group Profile Management */}
        {(activeScope.type === 'school' || activeScope.type === 'yeargroup') && (
           <Card className="flex flex-col gap-4 border border-border-light shadow-social-card hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between border-b border-border-light pb-3">
                 <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 m-0"><ImageIcon className="text-blue-500" size={22} strokeWidth={2.5}/> Group Identity</h2>
              </div>
              <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
                Update the official profile picture/avatar for {activeScope.label}. This represents your group across the platform.
              </p>
              <div className="flex justify-between items-center mt-auto pt-2 gap-2">
                <input key={`avatar-${inputKey}`} type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <Button size="sm" variant="secondary" onClick={() => { setInputKey(Date.now()); setTimeout(() => avatarInputRef.current?.click(), 50); }} disabled={assigning} className="flex-1 font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title flex items-center justify-center gap-2">
                   <Camera size={16} /> {assigning ? 'Uploading...' : 'Upload New Picture'}
                </Button>
              </div>
           </Card>
        )}

        {/* Social & Contacts Hub */}
        {activeScope.type !== 'all' && (
           <Card className="flex flex-col gap-4 border border-border-light shadow-social-card hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between border-b border-border-light pb-3">
                 <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 m-0"><LinkIcon className="text-purple-500" size={22} strokeWidth={2.5}/> Contacts & Social Links</h2>
              </div>
              <p className="text-[14px] text-ink-body flex-1 leading-relaxed">
                Manage official {activeScope.label} social media pages, verified email contacts, and phone lines.
              </p>
              <div className="flex justify-between items-center mt-auto pt-2 gap-2">
                <Button size="sm" variant="secondary" onClick={() => setIsSocialModalOpen(true)} className="flex-1 font-bold shadow-sm bg-surface-muted border border-border-light text-ink-title">Config</Button>
              </div>
           </Card>
        )}

      </div>

      {/* Role Assignment Modal */}
      <Modal isOpen={isRolesModalOpen} onClose={() => setIsRolesModalOpen(false)} title={`Assign Governance Roles - ${activeScope.label}`}>
         <form onSubmit={handleAssignRole} className="flex flex-col gap-4 py-2">
            <p className="text-[14px] text-ink-body leading-relaxed mb-2">
              Select a member of <strong>{activeScope.label}</strong> to elevate them to an administrative position. This will grant them the ability to review newsletters and access the dashboard backend.
            </p>
            {loadingMembers ? (
               <div className="animate-pulse h-10 w-full bg-surface-muted rounded-lg border border-border-light"></div>
            ) : (
               <Select 
                 label="Platform Member" 
                 options={memberOptions} 
                 value={targetUserId}
                 onChange={(e) => setTargetUserId(e.target.value)}
                 required
               />
            )}
            
            <Select 
               label={`Tier ${activeScope.type === 'school' ? 4 : activeScope.type === 'house' ? 3 : activeScope.type === 'club' ? 2 : 1} Governance Title`} 
               options={roleOptions} 
               value={targetRole}
               onChange={(e) => setTargetRole(e.target.value)}
               required 
            />
            
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-light">
               <Button variant="ghost" type="button" onClick={() => setIsRolesModalOpen(false)}>Cancel</Button>
               <Button type="submit" disabled={assigning || !targetUserId || !targetRole} className="flex gap-2 items-center">
                  <CheckCircle size={18} strokeWidth={2.5}/> Confirm Assignment
               </Button>
            </div>
         </form>
      </Modal>

      {/* Social Links Setup Modal */}
      <Modal isOpen={isSocialModalOpen} onClose={() => setIsSocialModalOpen(false)} title={`Social & Contacts - ${activeScope.label}`}>
         <form onSubmit={handleSaveSocials} className="flex flex-col gap-3 py-2">
            <p className="text-[14px] text-ink-body leading-relaxed mb-2">
              Provide the official communication links for this group. Leaving a field blank will hide it from the UI.
            </p>
            {loadingSocials ? (
               <div className="animate-pulse h-20 w-full bg-surface-muted rounded-lg border border-border-light"></div>
            ) : (
               <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {(activeScope.type === 'school' || activeScope.type === 'club' || activeScope.type === 'house') && (
                     <div className="flex flex-col gap-1.5">
                        <label className="text-[14px] font-bold text-ink-title">Facebook Page URL</label>
                        <input type="url" className="w-full px-3 py-2 border border-border-light rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500" value={socialSettings.facebookPage || ''} onChange={e => setSocialSettings({...socialSettings, facebookPage: e.target.value})} placeholder="https://facebook.com/..." />
                     </div>
                  )}
                  {(activeScope.type === 'school' || activeScope.type === 'yeargroup') && (
                     <div className="flex flex-col gap-1.5 border-t border-border-light pt-3">
                        <label className="text-[14px] font-bold text-ink-title">Facebook Group URL</label>
                        <input type="url" className="w-full px-3 py-2 border border-border-light rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500" value={socialSettings.facebookGroup || ''} onChange={e => setSocialSettings({...socialSettings, facebookGroup: e.target.value})} placeholder="https://facebook.com/groups/..." />
                     </div>
                  )}
                  {(activeScope.type === 'yeargroup' || activeScope.type === 'club' || activeScope.type === 'house') && (
                     <div className="flex flex-col gap-1.5 border-t border-border-light pt-3">
                        <label className="text-[14px] font-bold text-ink-title">WhatsApp Group Invite Link</label>
                        <input type="url" className="w-full px-3 py-2 border border-border-light rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500" value={socialSettings.whatsapp || ''} onChange={e => setSocialSettings({...socialSettings, whatsapp: e.target.value})} placeholder="https://chat.whatsapp.com/..." />
                     </div>
                  )}
                  {activeScope.type === 'yeargroup' && (
                     <div className="flex flex-col gap-1.5 border-t border-border-light pt-3">
                        <label className="text-[14px] font-bold text-ink-title">Telegram Group Link</label>
                        <input type="url" className="w-full px-3 py-2 border border-border-light rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500" value={socialSettings.telegram || ''} onChange={e => setSocialSettings({...socialSettings, telegram: e.target.value})} placeholder="https://t.me/..." />
                     </div>
                  )}
                  {activeScope.type === 'school' && (
                     <>
                        <div className="flex flex-col gap-1.5 border-t border-border-light pt-3">
                           <label className="text-[14px] font-bold text-ink-title">Twitter / X URL</label>
                           <input type="url" className="w-full px-3 py-2 border border-border-light rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500" value={socialSettings.twitter || ''} onChange={e => setSocialSettings({...socialSettings, twitter: e.target.value})} placeholder="https://twitter.com/..." />
                        </div>
                        <div className="flex flex-col gap-1.5 border-t border-border-light pt-3">
                           <label className="text-[14px] font-bold text-ink-title">Threads URL</label>
                           <input type="url" className="w-full px-3 py-2 border border-border-light rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500" value={socialSettings.threads || ''} onChange={e => setSocialSettings({...socialSettings, threads: e.target.value})} placeholder="https://threads.net/..." />
                        </div>
                        <div className="flex flex-col gap-1.5 border-t border-border-light pt-3">
                           <label className="text-[14px] font-bold text-ink-title">Official Email(s)</label>
                           <input type="text" className="w-full px-3 py-2 border border-border-light rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500" value={socialSettings.email || ''} onChange={e => setSocialSettings({...socialSettings, email: e.target.value})} placeholder="contact@school.edu, info@school.edu" />
                        </div>
                        <div className="flex flex-col gap-1.5 border-t border-border-light pt-3">
                           <label className="text-[14px] font-bold text-ink-title">Official Phone Contact(s)</label>
                           <input type="text" className="w-full px-3 py-2 border border-border-light rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500" value={socialSettings.phone || ''} onChange={e => setSocialSettings({...socialSettings, phone: e.target.value})} placeholder="+123 456 7890" />
                        </div>
                     </>
                  )}
               </div>
            )}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border-light">
               <Button variant="ghost" type="button" onClick={() => setIsSocialModalOpen(false)}>Cancel</Button>
               <Button type="submit" disabled={savingSocials} className="flex gap-2 items-center">
                  <CheckCircle size={18} strokeWidth={2.5}/> {savingSocials ? 'Saving...' : 'Save Settings'}
               </Button>
            </div>
         </form>
      </Modal>

      {avatarImage && (
         <ProfileCropper 
            imageSrc={avatarImage} 
            onComplete={handleAvatarCropComplete} 
            onCancel={() => { setAvatarImage(null); if (avatarInputRef.current) avatarInputRef.current.value = ""; }} 
         />
      )}
    </div>
  );
}
