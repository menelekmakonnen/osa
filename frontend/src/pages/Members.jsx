import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authState } from '../api/client';
import { Card, Badge, Modal, Input, ChequeChip, Button } from '../components/ui';
import { Search, MapPin, Briefcase, Mail, Phone, Linkedin, Lock, Instagram, Twitter, Facebook, Share2, MessageCircle, Edit, AlertTriangle } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export function Members() {
  const { activeScope } = useTenant();
  const navigate = useNavigate();
  const currentUser = authState.getUser();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMember, setSelectedMember] = useState(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMembers(activeScope);
      setMembers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeScope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Client-side search (Name and Profession)
  const filteredMembers = members.filter(m => {
     if(!searchQuery) return true;
     const q = searchQuery.toLowerCase();
     return (m.name && m.name.toLowerCase().includes(q)) || 
            (m.profession && m.profession.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-4 pb-12 w-full max-w-[680px] mx-auto">
      
      {/* Header Area */}
      <div className="bg-surface-default p-4 rounded-[var(--radius-social)] shadow-social-card border border-border-light flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-title m-0">Directory</h1>
          <p className="text-[14px] text-ink-muted mt-0.5">Find and connect with fellow old students.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-border-light pt-3">
          
          <div className="relative w-full flex-1">
             <Search className="absolute left-3 top-2.5 text-ink-muted" size={18} strokeWidth={2.5} />
             <Input 
               placeholder={`Search for alumni in ${activeScope.label}...`} 
               className="!mb-0" 
               inputClassName="pl-10 h-10 w-full bg-surface-muted text-[15px] font-medium placeholder-ink-muted rounded-pill border border-transparent focus:border-border-light focus:bg-white transition-colors outline-none px-4"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          
        </div>
      </div>

      {/* Members Grid */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-2 animate-pulse pt-2">
             <div className="h-20 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
             <div className="h-20 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
             <div className="h-20 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 text-ink-muted bg-surface-default rounded-[var(--radius-social)] border border-border-light shadow-social-card">
             No members found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredMembers.map(m => (
              <MemberCard 
                key={m.id} 
                member={m} 
                onClick={() => setSelectedMember(m)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Member Details Modal */}
      <Modal isOpen={!!selectedMember} onClose={() => setSelectedMember(null)} title="Member Profile" noPadding>
         {selectedMember && (
             <div className="flex flex-col relative w-full bg-surface-default pb-4">
                 {/* Modern Banner/Header */}
                 <div className="h-32 w-full relative bg-cover bg-center" style={{ backgroundColor: selectedMember.cheque_colour, backgroundImage: selectedMember.cover_url ? `url(${selectedMember.cover_url})` : 'none' }}>
                    {!selectedMember.cover_url && <div className="absolute inset-0 opacity-20 bg-black/10 mix-blend-overlay"></div>}
                 </div>
                 
                 {/* Avatar overlapping banner */}
                 <div className="px-6 flex justify-between items-end -mt-10 relative z-10">
                    <div className="w-24 h-24 rounded-full border-4 border-surface-default flex items-center justify-center text-white text-[32px] font-bold shadow-md bg-surface-muted overflow-hidden shrink-0" style={{ backgroundColor: selectedMember.profile_pic ? 'transparent' : selectedMember.cheque_colour }}>
                       {selectedMember.profile_pic ? (
                           <img src={selectedMember.profile_pic} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Profile" />
                       ) : (
                           selectedMember.name.charAt(0)
                       )}
                    </div>
                    
                    <div className="mb-2">
                       {selectedMember.role !== "Member" && (
                          <Badge colorHex="#22c55e" textHex="#ffffff" className="px-3 py-1 text-xs shadow-sm uppercase font-bold tracking-wider">{selectedMember.role}</Badge>
                       )}
                    </div>
                 </div>

                 {/* Profile Content */}
                 <div className="px-6 pb-2 pt-4 flex flex-col gap-6">
                    
                    {/* Name & Identity */}
                    <div className="flex flex-col">
                       <h2 className="text-[26px] font-extrabold text-ink-title m-0 leading-tight">
                          {selectedMember.name}
                       </h2>
                       <div className="text-[14px] font-semibold text-brand-600 mt-1">
                          {selectedMember.school}
                       </div>
                    </div>

                    {/* Identity Chips */}
                    <div className="flex justify-between items-center">
                       <div className="flex gap-2">
                          <ChequeChip colorHex={selectedMember.cheque_colour} text={selectedMember.year_group_nickname} className="shadow-sm border border-border-light" />
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-muted rounded-pill text-xs font-bold text-ink-title border border-border-light shadow-sm">
                             {selectedMember.house_name}
                          </div>
                       </div>
                       
                       {currentUser?.id === selectedMember.id ? (
                          <Button variant="ghost" size="sm" className="text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 flex items-center gap-2" onClick={() => navigate('/app/profile')}>
                             <Edit size={14} /> Edit Profile
                          </Button>
                       ) : (
                          selectedMember.role !== "Member" && (
                             <Button variant="ghost" size="sm" className="text-red-600 border border-red-200 bg-red-50 flex items-center gap-2 hover:bg-red-100 shadow-sm" onClick={() => alert("SLA violation petition has been filed and routed to the ICUNI board threshold algorithm.")}>
                                <AlertTriangle size={14} /> File Petition
                             </Button>
                          )
                       )}
                    </div>

                    <div className="w-full h-[1px] bg-border-light mt-1"></div>

                    {/* Content / Privacy Check */}
                    {(() => {
                        let socialLinks = {};
                        try { socialLinks = JSON.parse(selectedMember.social_links || "{}"); } catch(e){ console.warn(e); }
                        const hasSocials = Object.values(socialLinks).some(v => !!v);
                        
                        if (!selectedMember.bio && !selectedMember.profession && !selectedMember.location && !selectedMember.email && !selectedMember.phone && !selectedMember.linkedin && !hasSocials) {
                            return (
                                <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-surface-muted/50 rounded-[16px] border border-dashed border-border-light">
                                   <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-ink-muted mb-3">
                                      <Lock size={20} strokeWidth={2.5} />
                                   </div>
                                   <h3 className="text-[16px] font-bold text-ink-title mb-1">Private Profile</h3>
                                   <p className="text-[14px] text-ink-muted leading-relaxed max-w-[280px]">
                                      This member has chosen to keep their contact and professional details private.
                                   </p>
                                </div>
                            );
                        }
                        
                        return (
                        <div className="flex flex-col gap-5 text-[15px]">
                            {selectedMember.bio && (
                                <div className="p-4 bg-brand-50/50 rounded-[12px] border border-brand-100/50 relative overflow-hidden">
                                   <div className="absolute top-0 left-0 w-1 h-full bg-brand-400"></div>
                                   <div className="text-[11px] font-bold text-brand-600 uppercase tracking-wider mb-2">About</div>
                                   <p className="text-ink-title leading-relaxed">"{selectedMember.bio}"</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               {selectedMember.profession && (
                                  <ModernDetailRow icon={<Briefcase size={16}/>} label="Profession" value={selectedMember.profession} />
                               )}
                               {selectedMember.location && (
                                  <ModernDetailRow icon={<MapPin size={16}/>} label="Location" value={selectedMember.location} />
                               )}
                               {selectedMember.email && (
                                  <ModernDetailRow icon={<Mail size={16}/>} label="Email" value={<a href={`mailto:${selectedMember.email}`} className="hover:underline text-ink-title truncate block max-w-full">{selectedMember.email}</a>} />
                               )}
                               {selectedMember.phone && (
                                  <ModernDetailRow icon={<Phone size={16}/>} label="Phone" value={selectedMember.phone} />
                               )}
                               {selectedMember.linkedin && (
                                  <ModernDetailRow icon={<Linkedin size={16}/>} label="LinkedIn" value={<a href={selectedMember.linkedin} target="_blank" rel="noreferrer" className="text-brand-600 font-semibold hover:underline truncate inline-block max-w-[150px] align-bottom">View Profile</a>} />
                               )}
                               {socialLinks.ig && (
                                   <ModernDetailRow icon={<Instagram size={16}/>} label="Instagram" value={socialLinks.ig} />
                                )}
                                {socialLinks.x && (
                                   <ModernDetailRow icon={<Twitter size={16}/>} label="X (Twitter)" value={socialLinks.x} />
                                )}
                                {socialLinks.tiktok && (
                                   <ModernDetailRow icon={<Share2 size={16}/>} label="TikTok" value={socialLinks.tiktok} />
                                )}
                                {socialLinks.fb && (
                                   <ModernDetailRow icon={<Facebook size={16}/>} label="Facebook" value={socialLinks.fb} />
                                )}
                                {socialLinks.snapchat && (
                                   <ModernDetailRow icon={<MessageCircle size={16}/>} label="Snapchat" value={socialLinks.snapchat} />
                                )}
                                {socialLinks.discord && (
                                   <ModernDetailRow icon={<MessageCircle size={16}/>} label="Discord" value={socialLinks.discord} />
                                )}
                             </div>
                        </div>
                    );
                    })()}
                 </div>
             </div>
         )}
      </Modal>

    </div>
  );
}

// Helpers

function MemberCard({ member, onClick }) {
  return (
    <Card hoverable className="flex items-center justify-between p-3 border border-border-light shadow-social-card" onClick={onClick}>
      <div className="flex items-center gap-3 overflow-hidden">
         <div className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-white font-bold shadow-sm" style={{ backgroundColor: member.cheque_colour }}>
            {member.name.charAt(0)}
         </div>
         <div className="flex flex-col truncate pr-2">
            <h3 className="text-[16px] font-bold m-0 text-ink-title truncate leading-snug">{member.name}</h3>
            {member.profession ? (
               <span className="text-[13px] text-ink-body font-medium truncate">{member.profession}</span>
            ) : (
                <span className="text-[12px] text-ink-muted truncate italic">Role hidden</span>
            )}
         </div>
      </div>

      <div className="flex items-center shrink-0 pr-1">
          <ChequeChip colorHex={member.cheque_colour} text={member.year_group_nickname} className="scale-90" />
      </div>
    </Card>
  );
}

function ModernDetailRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-3 p-3 bg-surface-muted/50 rounded-[12px] border border-border-light hover:bg-surface-muted transition-colors">
           <div className="text-brand-600 bg-white shadow-sm p-2 rounded-full flex-shrink-0 mt-0.5">{icon}</div>
           <div className="flex flex-col overflow-hidden justify-center min-h-[32px] max-w-full">
              <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-0.5">{label}</span>
              <span className="text-ink-title text-[14px] font-semibold truncate leading-tight block w-full">{value}</span>
           </div>
        </div>
    );
}
