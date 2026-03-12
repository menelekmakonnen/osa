import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, Modal } from '../components/ui';
import { Calendar, MapPin, Video, Users, Link as LinkIcon, CheckCircle } from 'lucide-react';

export function Events() {
  const [activeFilter, setActiveFilter] = useState('all'); // all, virtual, meetup, hangout
  const [scopeFilter, setScopeFilter] = useState('my_school'); // my_yg, my_school, all_schools
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState(null); // For details modal
  const [rsvping, setRsvping] = useState(false);

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
      alert("Error RSVPing: " + err.message);
    } finally {
      setRsvping(false);
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
        <div>
          <h1 className="text-xl font-bold text-ink-title m-0">Events</h1>
          <p className="text-[14px] text-ink-muted mt-0.5">Virtual hangouts, formal meetups, and cross-school webinars.</p>
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
             <option value="my_yg">My Year Group</option>
             <option value="my_school">My School</option>
             <option value="all_schools">All Schools</option>
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
