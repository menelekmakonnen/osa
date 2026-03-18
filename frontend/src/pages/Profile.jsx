import React, { useState, useEffect, useRef } from 'react';
import { api, authState } from '../api/client';
import { Card, Button, Input, Textarea, Select, Badge, ChequeChip } from '../components/ui';
import { Save, UserCircle, ShieldAlert, Camera, Share2 } from 'lucide-react';
import { ProfileCropper } from '../components/ImageUpload';

export function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // The state tracking changes
  const [formData, setFormData] = useState({});

  // Profile picture cropping state
  const [cropImage, setCropImage] = useState(null);
  const fileInputRef = useRef(null);

  // Cover image cropping state
  const [coverCropImage, setCoverCropImage] = useState(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
      let socialLinks = {};
      try { socialLinks = JSON.parse(data.social_links || "{}"); } catch(e){ console.warn(e); }

      setFormData({
         name: data.name || '',
         username: data.username || '',
         profession: data.profession || '',
         location: data.location || '',
         phone: data.phone || '',
         linkedin: data.linkedin || '',
         bio: data.bio || '',
         social_ig: socialLinks.ig || '',
         social_tiktok: socialLinks.tiktok || '',
         social_fb: socialLinks.fb || '',
         social_x: socialLinks.x || '',
         social_discord: socialLinks.discord || '',
         social_snapchat: socialLinks.snapchat || '',
         priv_email: data.priv_email || 'yeargroup',
         priv_phone: data.priv_phone || 'hidden',
         priv_location: data.priv_location || 'all',
         priv_profession: data.priv_profession || 'all',
         priv_linkedin: data.priv_linkedin || 'all',
         priv_bio: data.priv_bio || 'yeargroup',
         priv_social: data.priv_social || 'yeargroup',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { ...formData };
    payload.social_links = JSON.stringify({
       ig: formData.social_ig,
       tiktok: formData.social_tiktok,
       fb: formData.social_fb,
       x: formData.social_x,
       discord: formData.social_discord,
       snapchat: formData.social_snapchat
    });
    delete payload.social_ig;
    delete payload.social_tiktok;
    delete payload.social_fb;
    delete payload.social_x;
    delete payload.social_discord;
    delete payload.social_snapchat;

    try {
      const updated = await api.updateProfile(payload);
      // Update local session user object
      authState.setSession(authState.getToken(), updated);
      setProfile(updated);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Error saving profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImage(reader.result));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = async (base64Img) => {
    setCropImage(null);
    setSaving(true);
    try {
      const result = await api.uploadImage({
          group_id: "profile_pics",
          image_base64: base64Img,
          file_name: `profile_${profile.id}.jpg`
      });
      const updated = await api.updateProfile({ profile_pic: result.url });
      authState.setSession(authState.getToken(), { ...authState.getUser(), profile_pic: result.url });
      setProfile(updated);
    } catch(err) {
      console.error(err);
      alert("Failed to upload profile picture.");
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCoverChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setCoverCropImage(reader.result));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCoverCropComplete = async (base64Img) => {
    setCoverCropImage(null);
    setSaving(true);
    try {
      const result = await api.uploadImage({
          group_id: "profile_covers",
          image_base64: base64Img,
          file_name: `cover_${profile.id}.jpg`
      });
      const updated = await api.updateProfile({ cover_url: result.url });
      authState.setSession(authState.getToken(), { ...authState.getUser(), cover_url: result.url });
      setProfile(updated);
    } catch(err) {
      console.error(err);
      alert("Failed to upload cover picture.");
    } finally {
      setSaving(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  if (loading) return <div className="text-muted text-center py-10">Loading profile...</div>;
  if (!profile) return null;

  const privacyOptions = [
    { value: 'hidden', label: 'Hidden (Only IT)' },
    { value: 'yeargroup', label: 'Year Group Only' },
    { value: 'school', label: 'School Only' },
    { value: 'all', label: 'All Old Students' }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[800px] mx-auto pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-ink-title m-0">My Profile</h1>
        <p className="text-[14px] text-ink-muted mt-0.5">Manage your personal information and privacy settings.</p>
      </div>

      {/* Cover Image Area */}
      <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden relative group bg-surface-muted border border-border-light shadow-sm shrink-0">
         <div className="absolute inset-0 bg-surface-muted overflow-hidden">
               {profile.cover_url ? (
                  <img src={profile.cover_url} referrerPolicy="no-referrer" alt="Cover" className="w-full h-full object-cover" />
               ) : (
            <div className="w-full h-full bg-gradient-to-r from-brand-600/20 to-brand-400/20 flex items-center justify-center">
               <span className="text-brand-600/50 font-bold text-lg">No Cover Image</span>
            </div>
         )}
         </div>
         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <input type="file" ref={coverInputRef} accept="image/*" className="hidden" onChange={handleCoverChange} />
            <Button onClick={() => { if(coverInputRef.current) coverInputRef.current.value = ""; coverInputRef.current.click(); }} variant="secondary" className="flex items-center gap-2 font-bold bg-white text-ink-title hover:bg-surface-hover">
               <Camera size={18} strokeWidth={2.5}/> Change Cover
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         
         {/* Edit Form - 2 Columns wide */}
         <div className="md:col-span-2">
            <form id="profile-form" onSubmit={handleSave} className="flex flex-col gap-6">
               <Card className="flex flex-col gap-6 !p-6 border border-border-light shadow-social-card max-w-full overflow-hidden">
                  <div className="flex justify-between items-center border-b border-border-light pb-4">
                     <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2">
                        <UserCircle className="text-brand-500" size={24} strokeWidth={2.5}/> Edit Information
                     </h2>
                     <div className="relative group shrink-0">
                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                        <button type="button" onClick={() => { if(fileInputRef.current) fileInputRef.current.value = ""; fileInputRef.current.click(); }} className="relative rounded-full overflow-hidden border border-border-light shadow-sm w-[60px] h-[60px] block transition-transform group-hover:scale-105">
                           {profile.profile_pic ? (
                              <img src={profile.profile_pic} referrerPolicy="no-referrer" alt="Profile" className="w-full h-full object-cover bg-white" />
                           ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-2xl">
                                 {profile.name.charAt(0)}
                              </div>
                           )}
                           <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/50 flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Camera size={14} className="text-white"/>
                           </div>
                        </button>
                     </div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                     <PrivacyFieldRow 
                       label="Full Name" 
                       name="name" 
                       value={formData.name} 
                       onChange={handleChange}
                       privacyFixed="Always Public"
                       required
                     />

                     <PrivacyFieldRow 
                       label="Username" 
                       name="username" 
                       value={formData.username} 
                       onChange={handleChange}
                       privacyFixed="Always Public"
                       required
                     />
                     
                     <PrivacyFieldRow 
                       label="Profession / Occupation" 
                       name="profession" 
                       value={formData.profession} 
                       onChange={handleChange}
                       privName="priv_profession"
                       privValue={formData.priv_profession}
                       privOptions={privacyOptions}
                     />

                     <PrivacyFieldRow 
                       label="Location (City, Country)" 
                       name="location" 
                       value={formData.location} 
                       onChange={handleChange}
                       privName="priv_location"
                       privValue={formData.priv_location}
                       privOptions={privacyOptions}
                     />

                     <PrivacyFieldRow 
                       label="Phone Number" 
                       name="phone" 
                       value={formData.phone} 
                       onChange={handleChange}
                       type="tel"
                       privName="priv_phone"
                       privValue={formData.priv_phone}
                       privOptions={privacyOptions}
                     />

                     <PrivacyFieldRow 
                       label="LinkedIn Profile URL" 
                       name="linkedin" 
                       value={formData.linkedin} 
                       onChange={handleChange}
                       type="url"
                       privName="priv_linkedin"
                       privValue={formData.priv_linkedin}
                       privOptions={privacyOptions}
                     />

                     {/* Email is read-only for editing but privacy is changeable */}
                     <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="flex-1 w-full">
                          <Input label="Email Address" value={profile.email} disabled className="bg-cream text-muted" />
                        </div>
                        <div className="w-full md:w-48 mt-0 md:mt-3">
                           <Select 
                              name="priv_email"
                              value={formData.priv_email}
                              onChange={handleChange}
                              options={privacyOptions}
                           />
                        </div>
                     </div>

                     <div className="flex flex-col gap-1 mt-2">
                        <label className="text-sm font-medium text-forest">Short Bio</label>
                        <Textarea 
                          name="bio"
                          value={formData.bio}
                          onChange={handleChange}
                          rows={4}
                          maxLength={500}
                          placeholder="Tell your old schoolmates what you've been up to..."
                        />
                        <div className="flex justify-end mt-1">
                           <div className="w-full md:w-48">
                              <Select 
                                 name="priv_bio"
                                 value={formData.priv_bio}
                                 onChange={handleChange}
                                 options={privacyOptions}
                              />
                           </div>
                        </div>
                     </div>
                  </div>
               </Card>

               {/* Social Links Card */}
               <Card className="flex flex-col gap-6 !p-6 border border-border-light shadow-social-card">
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-light pb-4">
                      <h2 className="text-[18px] font-bold text-ink-title flex items-center gap-2 shrink-0">
                         <Share2 className="text-brand-500" size={24} strokeWidth={2.5}/> Social Links
                      </h2>
                      <div className="w-full md:w-64 shrink-0">
                         <label className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1 block">Account Visibility</label>
                         <Select 
                            name="priv_social"
                            value={formData.priv_social}
                            onChange={handleChange}
                            options={privacyOptions}
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="Instagram" name="social_ig" value={formData.social_ig} onChange={handleChange} placeholder="@username" />
                      <Input label="TikTok" name="social_tiktok" value={formData.social_tiktok} onChange={handleChange} placeholder="@username" />
                      <Input label="X / Twitter" name="social_x" value={formData.social_x} onChange={handleChange} placeholder="@username" />
                      <Input label="Snapchat" name="social_snapchat" value={formData.social_snapchat} onChange={handleChange} placeholder="username" />
                      <Input label="Facebook" name="social_fb" value={formData.social_fb} onChange={handleChange} placeholder="Profile URL" />
                      <Input label="Discord" name="social_discord" value={formData.social_discord} onChange={handleChange} placeholder="username#1234" />
                   </div>

                   <div className="pt-6 border-t border-border-light flex justify-end">
                      <Button type="submit" disabled={saving} className="flex gap-2 font-bold shadow-sm px-6">
                         <Save size={18} strokeWidth={2.5}/> {saving ? 'Saving...' : 'Save All Changes'}
                      </Button>
                   </div>
               </Card>
            </form>
         </div>

         {/* Fixed Identity Sidebar - 1 Column wide */}
         <div className="flex flex-col gap-6">
            <Card className="bg-surface-muted border border-border-light shadow-none !p-5">
               <h3 className="text-[16px] font-bold text-ink-title flex items-center gap-2 mb-3">
                  <ShieldAlert size={18} className="text-brand-500" strokeWidth={2.5}/> School Identity
               </h3>
               <p className="text-[13px] text-ink-muted mb-4 pb-4 border-b border-border-light leading-relaxed">
                  These fields are fixed and locked to your account upon registration. If there is an error, please contact your Year Group executive.
               </p>
               
               {profile.username && (
                 <div className="text-center mb-4">
                    <span className="font-bold text-ink-title text-sm tracking-wide bg-white px-3 py-1.5 rounded-full border border-border-light shadow-sm">
                       @{profile.username}
                    </span>
                 </div>
               )}

               <div className="flex flex-col gap-4 text-[14px]">
                  <IdentityItem label="School" value={profile.school} />
                  <IdentityItem label="Association" value={profile.association} />
                  
                  <div className="flex flex-col gap-1">
                     <span className="text-[12px] font-bold text-ink-muted uppercase tracking-wider">Year Group</span>
                     <div className="mt-1">
                       <ChequeChip colorHex={profile.cheque_colour} text={profile.year_group_nickname || 'Member'} className="shadow-sm border border-black/5" />
                     </div>
                  </div>

                  <IdentityItem label="Final Class" value={profile.final_class} />
                  <IdentityItem label="House Name" value={profile.house_name} />
                  
                  <div className="flex flex-col gap-1">
                     <span className="text-[12px] font-bold text-ink-muted uppercase tracking-wider">Role</span>
                     <Badge className="w-max mt-1 font-bold uppercase tracking-wider text-[11px] px-2" colorHex="#22c55e" textHex="#ffffff">{profile.role}</Badge>
                  </div>
                  
                  <IdentityItem label="Date Joined" value={new Date(profile.date_joined).toLocaleDateString()} />
               </div>
            </Card>

            <div className="text-center">
               <Button variant="ghost" size="sm" className="font-bold text-ink-muted hover:text-ink-title">Change Password</Button>
            </div>
         </div>

      </div>

      {cropImage && (
         <ProfileCropper 
            imageSrc={cropImage} 
            onComplete={handleCropComplete} 
            onCancel={() => { setCropImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} 
         />
      )}
      
      {coverCropImage && (
         <ProfileCropper 
            imageSrc={coverCropImage} 
            onComplete={handleCoverCropComplete} 
            onCancel={() => { setCoverCropImage(null); if (coverInputRef.current) coverInputRef.current.value = ""; }}
            aspectRatio={3}
            circularCrop={false}
         />
      )}
    </div>
  );
}

// Helpers

function PrivacyFieldRow({ label, name, value, onChange, privName, privValue, privOptions, privacyFixed, ...inputProps }) {
    return (
       <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center py-2">
          <div className="flex-1 w-full">
            <Input 
              label={label} 
              name={name}
              value={value}
              onChange={onChange}
              className="!mb-0"
              {...inputProps}
            />
          </div>
          <div className="w-full md:w-48 mt-0 md:mt-6 shrink-0">
             {privacyFixed ? (
                <div className="h-10 flex items-center px-4 text-[13px] font-semibold text-ink-muted bg-surface-muted border border-transparent rounded-lg">
                   {privacyFixed}
                </div>
             ) : (
                <select 
                   name={privName}
                   value={privValue}
                   onChange={onChange}
                   className="h-10 w-full px-3 text-[13px] font-semibold text-ink-title bg-surface-default border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                >
                  {privOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
             )}
          </div>
       </div>
    );
}

function IdentityItem({ label, value }) {
   return (
      <div className="flex flex-col gap-1">
         <span className="text-[12px] font-bold text-ink-muted uppercase tracking-wider">{label}</span>
         <span className="font-bold text-ink-title text-[15px]">{value || 'N/A'}</span>
      </div>
   );
}
