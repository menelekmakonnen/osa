import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Card, Badge, Modal, Input, ChequeChip } from '../components/ui';
import { Search, MapPin, Briefcase, Mail, Phone, Linkedin, UserCircle } from 'lucide-react';

export function Members() {
  const [scopeFilter, setScopeFilter] = useState('my_yg'); // my_yg, my_school, all_schools
  const [searchQuery, setSearchQuery] = useState('');
  
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMember, setSelectedMember] = useState(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Map frontend scope to backend scope
      const apiScope = scopeFilter === 'my_yg' ? 'yeargroup' : 
                       scopeFilter === 'my_school' ? 'school' : 'all';
      const data = await api.getMembers(apiScope);
      setMembers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [scopeFilter]);

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

        {/* Directory Controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-border-light pt-3">
          
          <div className="relative w-full sm:w-auto flex-1">
             <Search className="absolute left-3 top-2.5 text-ink-muted" size={18} strokeWidth={2.5} />
             <Input 
               placeholder="Search by name or profession..." 
               className="!mb-0" 
               inputClassName="pl-10 h-10 w-full bg-surface-muted text-[15px] font-medium placeholder-ink-muted rounded-pill border border-transparent focus:border-border-light focus:bg-white transition-colors outline-none px-4"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>

          <select 
            className="bg-surface-muted border border-border-light rounded-lg text-[13px] font-semibold text-ink-title px-3 h-10 focus:outline-none focus:ring-2 focus:ring-brand-500 w-full sm:w-auto"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
          >
            <option value="my_yg">My Year Group</option>
            <option value="my_school">My School</option>
            <option value="all_schools">All Schools</option>
          </select>
          
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
      <Modal isOpen={!!selectedMember} onClose={() => setSelectedMember(null)} title="Member Profile">
         {selectedMember && (
            <div className="flex flex-col gap-6 pt-2">
               
               {/* Header Info */}
               <div className="flex items-center gap-4">
                  <div className="w-[72px] h-[72px] shrink-0 rounded-full flex items-center justify-center text-white text-[28px] font-bold shadow-sm" style={{ backgroundColor: selectedMember.cheque_colour }}>
                     {selectedMember.name.charAt(0)}
                  </div>
                  <div className="flex flex-col justify-center">
                     <h2 className="text-[24px] font-bold text-ink-title m-0 leading-tight">{selectedMember.name}</h2>
                     <div className="text-[14px] font-semibold text-brand-600 mt-1 flex items-center gap-2">
                        {selectedMember.school} 
                        {selectedMember.role !== "Member" && (
                           <Badge colorHex="#22c55e" textHex="#ffffff" className="text-[10px] uppercase font-bold tracking-wider">{selectedMember.role}</Badge>
                        )}
                     </div>
                  </div>
               </div>

               {/* Identity Row */}
               <div className="flex gap-3 bg-surface-muted p-3 border border-border-light rounded-[12px] shadow-sm">
                  <div className="flex-1 bg-surface-default p-2 rounded-lg border border-border-light flex flex-col items-center justify-center">
                     <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">Year Group</div>
                     <ChequeChip colorHex={selectedMember.cheque_colour} text={selectedMember.year_group_nickname} />
                  </div>
                  <div className="flex-1 bg-surface-default p-2 rounded-lg border border-border-light flex flex-col items-center justify-center">
                     <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">House</div>
                     <div className="font-bold text-ink-title text-[14px] text-center leading-tight">{selectedMember.house_name}</div>
                  </div>
               </div>

               {/* Content Links */}
               <div className="flex flex-col gap-3 text-[15px] mt-2">
                  
                  {selectedMember.bio && (
                      <div className="mb-3 px-1">
                         <div className="text-[12px] font-bold text-ink-muted uppercase tracking-wider mb-2">About</div>
                         <p className="text-ink-title leading-relaxed bg-surface-muted p-4 rounded-[12px] border border-border-light italic">"{selectedMember.bio}"</p>
                      </div>
                  )}

                  <div className="flex flex-col gap-1 px-1">
                     {selectedMember.profession && (
                        <DetailRow icon={<Briefcase size={20} strokeWidth={2}/>} label="Profession" value={selectedMember.profession} />
                     )}
                     {selectedMember.location && (
                        <DetailRow icon={<MapPin size={20} strokeWidth={2}/>} label="Location" value={selectedMember.location} />
                     )}
                     {selectedMember.email && (
                        <DetailRow icon={<Mail size={20} strokeWidth={2}/>} label="Email" value={<a href={`mailto:${selectedMember.email}`} className="text-brand-600 font-semibold hover:underline">{selectedMember.email}</a>} />
                     )}
                     {selectedMember.phone && (
                        <DetailRow icon={<Phone size={20} strokeWidth={2}/>} label="Phone" value={<span className="font-semibold text-ink-title">{selectedMember.phone}</span>} />
                     )}
                     {selectedMember.linkedin && (
                        <DetailRow icon={<Linkedin size={20} strokeWidth={2}/>} label="LinkedIn" value={<a href={selectedMember.linkedin} target="_blank" rel="noreferrer" className="text-brand-600 font-semibold hover:underline truncate inline-block max-w-[200px] align-bottom">{selectedMember.linkedin}</a>} />
                     )}
                  </div>

                  {!selectedMember.bio && !selectedMember.profession && !selectedMember.location && !selectedMember.email && !selectedMember.phone && !selectedMember.linkedin && (
                      <div className="text-center py-6 text-ink-muted border border-dashed border-border-light rounded-[12px] mt-4 font-medium">
                         This member has chosen to keep their contact details private.
                      </div>
                  )}

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

function DetailRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-4 py-3 border-b border-border-light last:border-0 hover:bg-surface-hover px-2 rounded-lg transition-colors">
           <div className="text-brand-500 mt-0.5 bg-brand-50 p-2 rounded-full">{icon}</div>
           <div className="flex flex-col overflow-hidden">
              <span className="text-[12px] font-bold text-ink-muted leading-tight uppercase tracking-wider mb-1">{label}</span>
              <span className="text-ink-title text-[15px] truncate">{value}</span>
           </div>
        </div>
    );
}
