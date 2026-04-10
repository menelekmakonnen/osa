import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authState } from '../api/client';
import { Card, Button, Input, Badge, ChequeChip, Modal, Skeleton } from '../components/ui';
import { ErrorCard } from '../components/ErrorCard';
import { toast } from 'react-hot-toast';
import { Search, MapPin, Briefcase, Mail, Phone, Linkedin, Lock, Instagram, Twitter, Facebook, Share2, MessageCircle, Edit, AlertTriangle } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { Avatar } from '../components/Avatar';

export function Members() {
  const { activeScope } = useTenant();
  const navigate = useNavigate();
  const currentUser = authState.getUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMembers(activeScope);
      setMembers(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [activeScope]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredMembers = members.filter(m => {
     if(!searchQuery) return true;
     const q = searchQuery.toLowerCase();
     return (m.name && m.name.toLowerCase().includes(q)) || (m.profession && m.profession.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-4 pb-12 w-full animate-fade-in">
      {error && <ErrorCard message={error} onRetry={loadData} context="Members Directory" />}
      
      <Card className="!p-4 flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-title m-0 tracking-tight">Directory</h1>
          <p className="text-[13px] text-ink-muted mt-0.5">Find and connect with fellow old students.</p>
        </div>
        <div className="relative w-full border-t border-border-light pt-3">
          <Search className="absolute left-3 top-[22px] text-ink-muted" size={18} strokeWidth={2.5} />
          <Input 
            placeholder={`Search alumni in ${activeScope.label}...`} 
            className="!mb-0" 
            inputClassName="pl-10 h-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card className="text-center py-12 text-ink-muted text-[14px]">No members found matching your criteria.</Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
            {filteredMembers.map(m => (
              <MemberCard key={m.id} member={m} onClick={() => setSelectedMember(m)} />
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedMember} onClose={() => setSelectedMember(null)} title="Member Profile" noPadding>
         {selectedMember && <MemberProfile member={selectedMember} currentUser={currentUser} navigate={navigate} />}
      </Modal>
    </div>
  );
}

function MemberCard({ member, onClick }) {
  return (
    <Card hoverable className="flex items-center justify-between !p-3" onClick={onClick}>
      <div className="flex items-center gap-3 overflow-hidden">
         <Avatar src={member.profile_pic} name={member.name} size="lg" />
         <div className="flex flex-col truncate pr-2">
            <h3 className="text-[14px] font-semibold m-0 text-ink-title truncate leading-snug">{member.name}</h3>
            {member.profession ? (
               <span className="text-[12px] text-ink-body truncate">{member.profession}</span>
            ) : (
                <span className="text-[11px] text-ink-muted truncate italic">Role hidden</span>
            )}
         </div>
      </div>
      <ChequeChip colorHex={member.cheque_colour} text={member.year_group_nickname} className="scale-90 shrink-0" />
    </Card>
  );
}

function MemberProfile({ member, currentUser, navigate }) {
  let socialLinks = {};
  try { socialLinks = JSON.parse(member.social_links || "{}"); } catch(e){}
  const hasSocials = Object.values(socialLinks).some(v => !!v);
  const hasData = member.bio || member.profession || member.location || member.email || member.phone || member.linkedin || hasSocials;
  
  return (
    <div className="flex flex-col relative w-full bg-surface-default pb-4">
      <div className="h-28 w-full relative bg-cover bg-center" style={{ background: `linear-gradient(135deg, ${member.cheque_colour || 'var(--school-primary)'}, var(--school-secondary))`, backgroundImage: member.cover_url ? `url(${member.cover_url})` : 'none', backgroundSize: 'cover' }}>
        {!member.cover_url && <div className="absolute inset-0 opacity-20 bg-black/10 mix-blend-overlay" />}
      </div>
      
      <div className="px-5 flex justify-between items-end -mt-10 relative z-10">
        <Avatar src={member.profile_pic} name={member.name} size="2xl" />
        {member.role !== "Member" && <Badge colorHex="#22c55e" textHex="#ffffff" className="mb-2 px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider">{member.role}</Badge>}
      </div>

      <div className="px-5 pb-2 pt-3 flex flex-col gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-ink-title m-0 leading-tight tracking-tight">{member.name}</h2>
          <div className="text-[13px] font-semibold mt-1" style={{ color: 'var(--school-primary)' }}>{member.school}</div>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <ChequeChip colorHex={member.cheque_colour} text={member.year_group_nickname} />
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-muted rounded-full text-[11px] font-semibold text-ink-title border border-border-light">{member.house_name}</div>
          </div>
          {currentUser?.id === member.id ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/app/profile')}><Edit size={14} /> Edit</Button>
          ) : member.role !== "Member" && (
            <Button variant="ghost" size="sm" className="text-red-600 border border-red-200 bg-red-50 dark:bg-red-900/10" onClick={() => toast.success("Petition filed.")}>
              <AlertTriangle size={14} /> Report
            </Button>
          )}
        </div>

        <div className="w-full h-[1px] bg-border-light" />

        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-surface-muted/50 rounded-2xl border border-dashed border-border-light">
            <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm text-ink-muted mb-3"><Lock size={18} /></div>
            <h3 className="text-[14px] font-bold text-ink-title mb-1">Private Profile</h3>
            <p className="text-[13px] text-ink-muted max-w-[240px]">This member keeps their details private.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {member.bio && (
              <div className="p-4 rounded-xl border relative overflow-hidden" style={{ background: 'var(--school-tint)', borderColor: 'var(--school-200)' }}>
                <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: 'var(--school-primary)' }} />
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--school-primary)' }}>About</div>
                <p className="text-ink-title text-[14px] leading-relaxed">"{member.bio}"</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {member.profession && <DetailRow icon={<Briefcase size={15}/>} label="Profession" value={member.profession} />}
              {member.location && <DetailRow icon={<MapPin size={15}/>} label="Location" value={member.location} />}
              {member.email && <DetailRow icon={<Mail size={15}/>} label="Email" value={<a href={`mailto:${member.email}`} className="hover:underline text-ink-title truncate block">{member.email}</a>} />}
              {member.phone && <DetailRow icon={<Phone size={15}/>} label="Phone" value={member.phone} />}
              {member.linkedin && <DetailRow icon={<Linkedin size={15}/>} label="LinkedIn" value={<a href={member.linkedin} target="_blank" rel="noreferrer" className="font-semibold hover:underline truncate" style={{ color: 'var(--school-primary)' }}>View Profile</a>} />}
              {socialLinks.ig && <DetailRow icon={<Instagram size={15}/>} label="Instagram" value={socialLinks.ig} />}
              {socialLinks.x && <DetailRow icon={<Twitter size={15}/>} label="X" value={socialLinks.x} />}
              {socialLinks.fb && <DetailRow icon={<Facebook size={15}/>} label="Facebook" value={socialLinks.fb} />}
              {socialLinks.tiktok && <DetailRow icon={<Share2 size={15}/>} label="TikTok" value={socialLinks.tiktok} />}
              {socialLinks.snapchat && <DetailRow icon={<MessageCircle size={15}/>} label="Snapchat" value={socialLinks.snapchat} />}
              {socialLinks.discord && <DetailRow icon={<MessageCircle size={15}/>} label="Discord" value={socialLinks.discord} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-surface-muted/50 rounded-xl border border-border-light hover:bg-surface-muted transition-colors">
       <div className="p-2 rounded-full bg-white dark:bg-slate-700 shadow-sm shrink-0 mt-0.5" style={{ color: 'var(--school-primary)' }}>{icon}</div>
       <div className="flex flex-col overflow-hidden min-h-[28px]">
          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">{label}</span>
          <span className="text-ink-title text-[13px] font-medium truncate">{value}</span>
       </div>
    </div>
  );
}
