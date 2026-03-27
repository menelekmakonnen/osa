import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, Modal } from '../components/ui';
import { Calendar, MapPin, Video, Users, Link as LinkIcon, CheckCircle, PlusCircle } from 'lucide-react';
import { authState } from '../api/client';
import { toast } from 'react-hot-toast';

export function Events() {
  const [activeFilter, setActiveFilter] = useState('all'); // all, virtual, meetup, hangout
  const [scopeFilter, setScopeFilter] = useState('my_school'); // my_yg, my_school, all_schools
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = authState.getUser();
  const isAdmin = user && (user.role.includes("Admin") || user.role === "ICUNI Staff");

  const [selectedEvent, setSelectedEvent] = useState(null); // For details modal
  const [rsvping, setRsvping] = useState(false);

  // Create Event modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', type: 'virtual', date: '', time: '',
    venue: '', virtual_link: '', scope: 'yeargroup', max_attendees: ''
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getEvents(scopeFilter);
      setEvents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [scopeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRSVP = async (e, eventId) => {
    e.stopPropagation(); // Prevent opening modal
    setRsvping(true);
    try {
      const res = await api.rsvp(eventId);
      
      // Optimistically update the linked state
      setEvents(prev => prev.map(evt => {
         if(evt.id === eventId) {
             return { ...evt, is_rsvpd: true, virtual_link: res.virtual_link };
         }
         return evt;
      }));

      // If the modal is open for this event, update its state too
      if(selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent({ ...selectedEvent, is_rsvpd: true, virtual_link: res.virtual_link });
      }
      
    } catch(err) {
      toast.error("Error RSVPing: " + err.message);
    } finally {
      setRsvping(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createEvent({
        ...newEvent,
        scope_type: newEvent.scope,
        scope_id: newEvent.scope === 'yeargroup' ? user.year_group_id : user.school
      });
      toast.success("Event created successfully!");
      setIsCreateOpen(false);
      setNewEvent({ title: '', description: '', type: 'virtual', date: '', time: '', venue: '', virtual_link: '', scope: 'yeargroup', max_attendees: '' });
      loadData();
    } catch (err) {
      toast.error("Error creating event: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredEvents = events.filter(e => {
    if (activeFilter === 'all') return true;
    return e.type === activeFilter;
  });

  return (
    <div className="flex flex-col gap-4 pb-12 w-full max-w-[680px] mx-auto">
      
      {/* Header Area */}
      <div className="bg-surface-default p-4 rounded-[var(--radius-social)] shadow-social-card border border-border-light flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-ink-title m-0">Events</h1>
              <p className="text-[14px] text-ink-muted mt-0.5">Virtual hangouts, formal meetups, and cross-school webinars.</p>
            </div>
            {isAdmin && (
                <Button 
                   onClick={() => setIsCreateOpen(true)} 
                   className="gap-2 shrink-0 font-semibold text-[14px]"
                >
                   <PlusCircle size={18} /> Create Event
                </Button>
            )}
        </div>

        {/* Segmented Control Filters */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 border-t border-border-light pt-3">
           <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <FilterButton label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
              <FilterButton label="Virtual" active={activeFilter === 'virtual'} onClick={() => setActiveFilter('virtual')} />
              <FilterButton label="Meetups" active={activeFilter === 'meetup'} onClick={() => setActiveFilter('meetup')} />
              <FilterButton label="Hangouts" active={activeFilter === 'hangout'} onClick={() => setActiveFilter('hangout')} />
           </div>
           <select 
             className="bg-surface-muted border border-border-light rounded-lg text-[13px] font-semibold text-ink-title px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
             value={scopeFilter}
             onChange={(e) => setScopeFilter(e.target.value)}
           >
             <option value="my_yg" style={{backgroundColor:'#fff',color:'#050505'}}>My Year Group</option>
             <option value="my_school" style={{backgroundColor:'#fff',color:'#050505'}}>My School</option>
             <option value="all_schools" style={{backgroundColor:'#fff',color:'#050505'}}>All Schools</option>
           </select>
        </div>
      </div>

      {/* Event Grid (Stacked feed) */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-4 animate-pulse pt-2">
             <div className="h-48 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-ink-muted bg-surface-default rounded-[var(--radius-social)] border border-border-light shadow-social-card">
             No upcoming events found for this filter.
          </div>
        ) : (
          filteredEvents.map(evt => (
            <EventCard 
              key={evt.id} 
              evt={evt} 
              onViewDetails={() => setSelectedEvent(evt)} 
              onRSVP={(e) => handleRSVP(e, evt.id)}
              isRsvping={rsvping}
            />
          ))
        )}
      </div>

      {/* Event Details Modal */}
      <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Details" wide>
         {selectedEvent && (
            <div className="flex flex-col md:flex-row gap-6">
               <div className="flex-1 flex flex-col gap-4">
                  <div>
                      <div className="flex gap-2 mb-3">
                         <TypeBadge type={selectedEvent.type} />
                         <Badge>{selectedEvent.scope === 'yeargroup' ? 'Year Group Only' : selectedEvent.scope === 'school' ? 'All School' : 'Platform Event'}</Badge>
                      </div>
                      <h2 className="text-[22px] font-bold text-ink-title leading-tight mb-2">{selectedEvent.title}</h2>
                      <p className="text-[15px] text-ink-title whitespace-pre-wrap leading-relaxed">{selectedEvent.description}</p>
                  </div>

                  {selectedEvent.is_rsvpd && (selectedEvent.type === 'virtual' || selectedEvent.type === 'hangout') && selectedEvent.virtual_link && (
                     <div className="p-4 bg-brand-50 border border-brand-200 rounded-[12px] flex flex-col gap-2 mt-4">
                        <h4 className="text-brand-700 font-bold flex items-center gap-2 text-[15px]"><LinkIcon size={18} strokeWidth={2.5}/> Meeting Link Revealed</h4>
                        <a href={selectedEvent.virtual_link} target="_blank" rel="noreferrer" className="text-ink-title font-medium hover:underline hover:text-brand-600 break-all">
                           {selectedEvent.virtual_link}
                        </a>
                     </div>
                  )}
               </div>

               {/* Right Sidebar in Modal */}
               <div className="w-full md:w-64 flex flex-col gap-4 shrink-0 border-t md:border-t-0 md:border-l border-border-light pt-4 md:pt-0 md:pl-6">
                  <div className="flex flex-col gap-4 text-[14px]">
                      <div className="flex items-start gap-3 text-ink-title font-medium">
                          <Calendar className="text-brand-500 shrink-0 mt-0.5" size={20} strokeWidth={2.5}/>
                          <div>
                            <div className="font-bold">{new Date(selectedEvent.date).toLocaleDateString()}</div>
                            <div className="text-ink-muted">{selectedEvent.time}</div>
                          </div>
                      </div>
                      
                      {selectedEvent.type === 'meetup' && selectedEvent.venue && (
                        <div className="flex items-start gap-3 text-ink-title font-bold">
                            <MapPin className="text-red-500 shrink-0 mt-0.5" size={20} strokeWidth={2.5}/>
                            <div className="leading-tight">{selectedEvent.venue}</div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 text-ink-title font-bold mt-2">
                          <Users className="text-blue-500 shrink-0 mt-0.5" size={20} strokeWidth={2.5}/>
                          <div>
                             {selectedEvent.max_attendees && selectedEvent.max_attendees !== "0" 
                                ? `Capacity: ${selectedEvent.max_attendees}` 
                                : 'No capacity limit'}
                          </div>
                      </div>
                  </div>

                  <div className="mt-auto pt-4">
                    {selectedEvent.is_rsvpd ? (
                       <Button variant="success" className="w-full cursor-default shadow-sm" disabled>
                          <CheckCircle size={18} strokeWidth={2.5} className="mr-2"/> RSVP Confirmed
                       </Button>
                    ) : (
                       <Button 
                         variant="primary"
                         className="w-full font-bold shadow-sm" 
                         onClick={(e) => handleRSVP(e, selectedEvent.id)}
                         disabled={rsvping}
                       >
                         {rsvping ? 'Processing...' : 'RSVP Now'}
                       </Button>
                    )}
                  </div>
               </div>
            </div>
         )}
      </Modal>

      {/* Create Event Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => !creating && setIsCreateOpen(false)} title="Create New Event">
        <form onSubmit={handleCreateEvent} className="flex flex-col gap-4 mt-2">
          <div className="mb-0">
            <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Event Title</label>
            <input className="social-input" required maxLength={120} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="e.g. Annual Reunion Dinner" />
          </div>
          <div className="mb-0">
            <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Description</label>
            <textarea className="social-textarea min-h-[80px]" required maxLength={1000} rows={3} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="What is this event about?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Type</label>
              <select className="social-input" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
                <option value="virtual">Virtual</option>
                <option value="meetup">Meetup</option>
                <option value="hangout">Hangout</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Scope</label>
              <select className="social-input" value={newEvent.scope} onChange={e => setNewEvent({...newEvent, scope: e.target.value})}>
                <option value="yeargroup">Year Group</option>
                <option value="school">Whole School</option>
                <option value="platform">All Schools</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Date</label>
              <input type="date" className="social-input" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Time</label>
              <input type="time" className="social-input" required value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
            </div>
          </div>
          {(newEvent.type === 'meetup') && (
            <div>
              <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Venue / Location</label>
              <input className="social-input" value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} placeholder="e.g. Cape Coast Community Centre" />
            </div>
          )}
          {(newEvent.type === 'virtual' || newEvent.type === 'hangout') && (
            <div>
              <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Meeting Link (revealed after RSVP)</label>
              <input type="url" className="social-input" value={newEvent.virtual_link} onChange={e => setNewEvent({...newEvent, virtual_link: e.target.value})} placeholder="https://meet.google.com/..." />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-ink-title mb-1.5 ml-1">Max Attendees (0 = unlimited)</label>
            <input type="number" className="social-input" min="0" value={newEvent.max_attendees} onChange={e => setNewEvent({...newEvent, max_attendees: e.target.value})} placeholder="0" />
          </div>
          <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-border-light">
            <Button variant="ghost" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Event'}</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

// Helpers

function FilterButton({ active, label, onClick }) {
    return (
      <button 
        onClick={onClick}
        className={`px-4 py-1.5 text-[13px] font-bold rounded-pill transition-all duration-200 whitespace-nowrap ${
          active 
            ? 'bg-ink-title text-white shadow-sm' 
            : 'bg-surface-muted text-ink-body hover:bg-surface-hover hover:text-ink-title'
        }`}
      >
        {label}
      </button>
    );
  }

function TypeBadge({ type }) {
    if(type === 'virtual') return <Badge colorHex="#E0E7FF" textHex="#312E81"><Video size={12} strokeWidth={2.5} className="inline mr-1" /> Virtual</Badge>;
    if(type === 'meetup') return <Badge colorHex="#FEE2E2" textHex="#991B1B"><MapPin size={12} strokeWidth={2.5} className="inline mr-1" /> Meetup</Badge>;
    return <Badge colorHex="#DCFCE7" textHex="#166534"><Users size={12} strokeWidth={2.5} className="inline mr-1" /> Hangout</Badge>;
}

function EventCard({ evt, onViewDetails, onRSVP, isRsvping }) {
  return (
    <Card hoverable className="!p-0 border border-border-light shadow-social-card flex flex-col" onClick={onViewDetails}>
      
      {/* Visual Header / Cover mock (Solid color tied to type) */}
      <div className={`h-24 w-full flex items-center justify-center ${evt.type === 'virtual' ? 'bg-indigo-50' : evt.type === 'meetup' ? 'bg-red-50' : 'bg-green-50'}`}>
         {evt.type === 'virtual' && <Video size={48} className="text-indigo-200"/>}
         {evt.type === 'meetup' && <MapPin size={48} className="text-red-200"/>}
         {evt.type === 'hangout' && <Users size={48} className="text-green-200"/>}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
           <TypeBadge type={evt.type} />
           <span className="text-[11px] font-bold text-ink-title bg-surface-muted px-2 py-0.5 rounded-pill uppercase tracking-wider border border-border-light shadow-sm">
             {new Date(evt.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
           </span>
        </div>
        
        <h3 className="text-[18px] font-bold m-0 mb-1 leading-tight text-ink-title">{evt.title}</h3>
        <p className="text-[14px] text-ink-title line-clamp-2 mb-4 flex-1">
           {evt.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-light">
           <div className="flex items-center gap-1.5 text-[13px] text-ink-title font-bold">
               <Calendar size={16} strokeWidth={2.5} className="text-brand-500" /> {evt.time}
           </div>
           {evt.is_rsvpd ? (
              <span className="text-[13px] font-bold text-brand-600 flex items-center gap-1.5"><CheckCircle size={16} strokeWidth={2.5}/> Going</span>
           ) : (
               <Button variant="secondary" size="sm" onClick={onRSVP} disabled={isRsvping} className="shadow-sm font-bold bg-surface-muted text-ink-title border-border-light">
                  RSVP
               </Button>
           )}
        </div>
      </div>
    </Card>
  );
}
