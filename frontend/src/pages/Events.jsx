import React, { useState, useEffect } from 'react';
import { api, authState } from '../api/client';
import { Card, Button, Badge, Modal, Input } from '../components/ui';
import { ErrorCard } from '../components/ErrorCard';
import { Calendar, MapPin, Video, Users, Link as LinkIcon, CheckCircle, PlusCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function Events() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('my_school');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = authState.getUser();
  const isAdmin = user && (user.role.includes("Admin") || user.role === "ICUNI Staff");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rsvping, setRsvping] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', type: 'virtual', date: '', time: '', venue: '', virtual_link: '', scope: 'yeargroup', max_attendees: '' });

  const loadData = React.useCallback(async () => {
    setLoading(true); setError(null);
    try { setEvents(await api.getEvents(scopeFilter) || []); }
    catch (e) { setError(e.message || 'Failed to load events'); }
    finally { setLoading(false); }
  }, [scopeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRSVP = async (e, eventId) => {
    e.stopPropagation(); setRsvping(true);
    try {
      const res = await api.rsvp(eventId);
      setEvents(prev => prev.map(evt => evt.id === eventId ? { ...evt, is_rsvpd: true, virtual_link: res.virtual_link } : evt));
      if(selectedEvent?.id === eventId) setSelectedEvent({ ...selectedEvent, is_rsvpd: true, virtual_link: res.virtual_link });
    } catch(err) { toast.error("Error: " + err.message); }
    finally { setRsvping(false); }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      await api.createEvent({ ...newEvent, scope_type: newEvent.scope, scope_id: newEvent.scope === 'yeargroup' ? user.year_group_id : user.school });
      toast.success("Event created!"); setIsCreateOpen(false);
      setNewEvent({ title: '', description: '', type: 'virtual', date: '', time: '', venue: '', virtual_link: '', scope: 'yeargroup', max_attendees: '' });
      loadData();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const filteredEvents = events.filter(e => activeFilter === 'all' || e.type === activeFilter);

  return (
    <div className="flex flex-col gap-4 pb-12 w-full animate-fade-in">
      {error && <ErrorCard message={error} onRetry={loadData} context="Events" />}

      <Card className="!p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-ink-title m-0 tracking-tight">Events</h1>
            <p className="text-[13px] text-ink-muted mt-0.5">Virtual hangouts, formal meetups, and webinars.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setIsCreateOpen(true)} variant="secondary" size="sm" className="gap-1.5 shrink-0">
              <PlusCircle size={16} /> Create
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-border-light pt-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <FilterPill label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
            <FilterPill label="Virtual" active={activeFilter === 'virtual'} onClick={() => setActiveFilter('virtual')} />
            <FilterPill label="Meetups" active={activeFilter === 'meetup'} onClick={() => setActiveFilter('meetup')} />
            <FilterPill label="Hangouts" active={activeFilter === 'hangout'} onClick={() => setActiveFilter('hangout')} />
          </div>
          <select className="osa-select !w-auto !py-1.5 text-[12px]" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)}>
            <option value="my_yg">My Year Group</option>
            <option value="my_school">My School</option>
            <option value="all_schools">All Schools</option>
          </select>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1,2].map(i => <div key={i} className="skeleton h-56 rounded-2xl" />)}
          </div>
        ) : filteredEvents.length === 0 ? (
          <Card className="text-center py-12 text-ink-muted text-[14px]">No upcoming events found.</Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
            {filteredEvents.map(evt => <EventCard key={evt.id} evt={evt} onViewDetails={() => setSelectedEvent(evt)} onRSVP={(e) => handleRSVP(e, evt.id)} isRsvping={rsvping} />)}
          </div>
        )}
      </div>

      {/* Details Modal */}
      <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Details" wide>
        {selectedEvent && (
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <div className="flex gap-2 mb-3"><TypeBadge type={selectedEvent.type} /><Badge>{selectedEvent.scope === 'yeargroup' ? 'Year Group' : selectedEvent.scope === 'school' ? 'School' : 'Platform'}</Badge></div>
                <h2 className="text-xl font-bold text-ink-title leading-tight mb-2 tracking-tight">{selectedEvent.title}</h2>
                <p className="text-[14px] text-ink-body whitespace-pre-wrap leading-relaxed">{selectedEvent.description}</p>
              </div>
              {selectedEvent.is_rsvpd && (selectedEvent.type === 'virtual' || selectedEvent.type === 'hangout') && selectedEvent.virtual_link && (
                <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: 'var(--school-tint)', border: '1px solid var(--school-200)' }}>
                  <h4 className="font-bold flex items-center gap-2 text-[14px]" style={{ color: 'var(--school-primary)' }}><LinkIcon size={16}/> Meeting Link</h4>
                  <a href={selectedEvent.virtual_link} target="_blank" rel="noreferrer" className="text-ink-title font-medium hover:underline break-all text-[13px]">{selectedEvent.virtual_link}</a>
                </div>
              )}
            </div>
            <div className="w-full md:w-56 flex flex-col gap-4 shrink-0 border-t md:border-t-0 md:border-l border-border-light pt-4 md:pt-0 md:pl-5">
              <div className="flex flex-col gap-3 text-[13px]">
                <div className="flex items-start gap-3 text-ink-title font-medium">
                  <Calendar className="shrink-0 mt-0.5" style={{ color: 'var(--school-primary)' }} size={18}/>
                  <div><div className="font-bold">{new Date(selectedEvent.date).toLocaleDateString()}</div><div className="text-ink-muted text-[12px]">{selectedEvent.time}</div></div>
                </div>
                {selectedEvent.type === 'meetup' && selectedEvent.venue && (
                  <div className="flex items-start gap-3 text-ink-title font-bold"><MapPin className="text-red-500 shrink-0 mt-0.5" size={18}/><div className="leading-tight text-[13px]">{selectedEvent.venue}</div></div>
                )}
                <div className="flex items-start gap-3 text-ink-title font-bold"><Users className="text-blue-500 shrink-0 mt-0.5" size={18}/><div className="text-[13px]">{selectedEvent.max_attendees && selectedEvent.max_attendees !== "0" ? `Capacity: ${selectedEvent.max_attendees}` : 'No limit'}</div></div>
              </div>
              <div className="mt-auto pt-4">
                {selectedEvent.is_rsvpd ? (
                  <Button variant="success" className="w-full cursor-default" disabled><CheckCircle size={16} className="mr-1.5"/> RSVP Confirmed</Button>
                ) : (
                  <Button variant="primary" className="w-full font-bold" onClick={(e) => handleRSVP(e, selectedEvent.id)} loading={rsvping}>{rsvping ? 'Processing...' : 'RSVP Now'}</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => !creating && setIsCreateOpen(false)} title="Create New Event">
        <form onSubmit={handleCreateEvent} className="flex flex-col gap-4 mt-2">
          <Input label="Event Title" required maxLength={120} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Annual Reunion Dinner" />
          <div><label className="block text-[13px] font-semibold text-ink-body mb-1.5 ml-0.5">Description</label><textarea className="social-textarea min-h-[80px]" required maxLength={1000} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="What's this event about?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[13px] font-semibold text-ink-body mb-1.5 ml-0.5">Type</label><select className="osa-select" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}><option value="virtual">Virtual</option><option value="meetup">Meetup</option><option value="hangout">Hangout</option></select></div>
            <div><label className="block text-[13px] font-semibold text-ink-body mb-1.5 ml-0.5">Scope</label><select className="osa-select" value={newEvent.scope} onChange={e => setNewEvent({...newEvent, scope: e.target.value})}><option value="yeargroup">Year Group</option><option value="school">School</option><option value="platform">All Schools</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" type="date" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
            <Input label="Time" type="time" required value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
          </div>
          {newEvent.type === 'meetup' && <Input label="Venue" value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} placeholder="Cape Coast Community Centre" />}
          {(newEvent.type === 'virtual' || newEvent.type === 'hangout') && <Input label="Meeting Link (revealed after RSVP)" type="url" value={newEvent.virtual_link} onChange={e => setNewEvent({...newEvent, virtual_link: e.target.value})} placeholder="https://meet.google.com/..." />}
          <Input label="Max Attendees (0 = unlimited)" type="number" min="0" value={newEvent.max_attendees} onChange={e => setNewEvent({...newEvent, max_attendees: e.target.value})} placeholder="0" />
          <div className="flex justify-end gap-2 mt-1 pt-3 border-t border-border-light">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Event</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function FilterPill({ active, label, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-1.5 text-[12px] font-semibold rounded-full transition-all whitespace-nowrap ${active ? 'text-white shadow-sm' : 'bg-surface-muted text-ink-body hover:bg-surface-hover'}`} style={active ? { background: 'var(--school-primary)', color: 'var(--school-on-primary)' } : undefined}>
      {label}
    </button>
  );
}

function TypeBadge({ type }) {
  if(type === 'virtual') return <Badge colorHex="#E0E7FF" textHex="#312E81"><Video size={11} strokeWidth={2.5} className="inline mr-1" /> Virtual</Badge>;
  if(type === 'meetup') return <Badge colorHex="#FEE2E2" textHex="#991B1B"><MapPin size={11} strokeWidth={2.5} className="inline mr-1" /> Meetup</Badge>;
  return <Badge colorHex="#DCFCE7" textHex="#166534"><Users size={11} strokeWidth={2.5} className="inline mr-1" /> Hangout</Badge>;
}

function EventCard({ evt, onViewDetails, onRSVP, isRsvping }) {
  const typeColors = { virtual: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-300' }, meetup: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-300' }, hangout: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-300' }};
  const tc = typeColors[evt.type] || typeColors.virtual;
  const TypeIcon = evt.type === 'virtual' ? Video : evt.type === 'meetup' ? MapPin : Users;

  return (
    <Card hoverable className="!p-0 flex flex-col" onClick={onViewDetails}>
      <div className={`h-20 w-full flex items-center justify-center ${tc.bg} rounded-t-[inherit]`}>
        <TypeIcon size={40} className={tc.icon} strokeWidth={1.5} />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <TypeBadge type={evt.type} />
          <span className="text-[10px] font-bold text-ink-title bg-surface-muted px-2 py-0.5 rounded-full uppercase tracking-wider border border-border-light">
            {new Date(evt.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <h3 className="text-[15px] font-bold m-0 mb-1 leading-tight text-ink-title">{evt.title}</h3>
        <p className="text-[13px] text-ink-body line-clamp-2 mb-3 flex-1">{evt.description}</p>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-light">
          <div className="flex items-center gap-1.5 text-[12px] text-ink-title font-semibold">
            <Calendar size={14} style={{ color: 'var(--school-primary)' }} /> {evt.time}
          </div>
          {evt.is_rsvpd ? (
            <span className="text-[12px] font-bold flex items-center gap-1" style={{ color: 'var(--school-primary)' }}><CheckCircle size={14}/> Going</span>
          ) : (
            <Button variant="secondary" size="sm" onClick={onRSVP} disabled={isRsvping} className="text-[12px]">RSVP</Button>
          )}
        </div>
      </div>
    </Card>
  );
}
