import React, { useState, useMemo } from 'react';
import { EventItem, Registration, CurrentUser } from '../types';
import { toValidUUID } from '../lib/supabase';
import {
  Calendar,
  MapPin,
  Users,
  Search,
  Check,
  AlertCircle,
  Clock,
  Ticket,
  XCircle,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface AttendeePortalProps {
  events: EventItem[];
  registrations: Registration[];
  currentUser: CurrentUser | null;
  onRegister: (eventId: string) => Promise<void>;
  onCancelRegistration: (registrationId: string) => Promise<void>;
  onOpenAuth: () => void;
  activeView: 'events' | 'my-registrations';
  setActiveView: (view: 'events' | 'my-registrations') => void;
}

// Helper to test if an event date is in the past
export const isEventPast = (dateString: string): boolean => {
  if (!dateString) return false;
  const eventTime = new Date(dateString).getTime();
  return !isNaN(eventTime) && eventTime < Date.now();
};

export const AttendeePortal: React.FC<AttendeePortalProps> = ({
  events,
  registrations,
  currentUser,
  onRegister,
  onCancelRegistration,
  onOpenAuth,
  activeView,
  setActiveView,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelModalReg, setCancelModalReg] = useState<{ id: string; title: string } | null>(null);

  // Compute map of event_id -> active registration count
  const eventRegistrationsCount = useMemo(() => {
    const counts: Record<string, number> = {};
    registrations.forEach((reg) => {
      const eId = reg.event_id;
      const validEId = toValidUUID(eId);
      counts[eId] = (counts[eId] || 0) + 1;
      if (validEId !== eId) {
        counts[validEId] = (counts[validEId] || 0) + 1;
      }
    });
    return counts;
  }, [registrations]);

  // Compute set of event IDs the current user is registered for
  const userRegisteredEventIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const userRegs = registrations.filter(
      (r) =>
        r.user_id === currentUser.id ||
        toValidUUID(r.user_id) === toValidUUID(currentUser.id)
    );
    const set = new Set<string>();
    userRegs.forEach((r) => {
      set.add(r.event_id);
      set.add(toValidUUID(r.event_id));
    });
    return set;
  }, [currentUser, registrations]);

  // Filter events for browsing (public non-draft events: published, completed, cancelled)
  const publishedEvents = useMemo(() => {
    return events.filter((evt) => evt.status !== 'draft');
  }, [events]);

  const filteredEvents = useMemo(() => {
    return publishedEvents.filter((evt) => {
      const q = searchQuery.toLowerCase();
      return (
        evt.title.toLowerCase().includes(q) ||
        evt.location.toLowerCase().includes(q) ||
        (evt.description && evt.description.toLowerCase().includes(q))
      );
    });
  }, [publishedEvents, searchQuery]);

  // Current user's registered list with event details
  const myRegistrationsList = useMemo(() => {
    if (!currentUser) return [];
    return registrations
      .filter(
        (r) =>
          r.user_id === currentUser.id ||
          toValidUUID(r.user_id) === toValidUUID(currentUser.id)
      )
      .map((r) => {
        const evt = events.find(
          (e) => e.id === r.event_id || toValidUUID(e.id) === toValidUUID(r.event_id)
        );
        return {
          registration: r,
          event: evt,
        };
      })
      .filter((item) => item.event !== undefined) as { registration: Registration; event: EventItem }[];
  }, [currentUser, registrations, events]);

  const handleRegisterClick = async (eventId: string) => {
    const targetEvent = events.find(
      (e) => e.id === eventId || toValidUUID(e.id) === toValidUUID(eventId)
    );
    if (!targetEvent) return;

    // Completely prevent registration if past date or cancelled/completed status
    const isPast = isEventPast(targetEvent.event_date);
    if (isPast || targetEvent.status === 'cancelled' || targetEvent.status === 'completed') {
      return;
    }

    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setRegisteringId(eventId);
    try {
      await onRegister(eventId);
    } finally {
      setRegisteringId(null);
    }
  };

  const confirmCancelRegistration = async () => {
    if (!cancelModalReg) return;
    setCancellingId(cancelModalReg.id);
    try {
      await onCancelRegistration(cancelModalReg.id);
      setCancelModalReg(null);
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        time: d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    } catch {
      return { date: isoString, time: '' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero / Banner for Nowshera Events Co. */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-400/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            Nowshera District Official Event Portal
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Experience Regional Gatherings, Expos & Bootcamps
          </h2>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed max-w-2xl">
            Register for official conferences, festivals, and leadership summits hosted across
            Nowshera, Risalpur, and the Kabul riverfront. Real-time seat allocation with instant booking.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => setActiveView('events')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                activeView === 'events'
                  ? 'bg-white text-emerald-900 shadow-md'
                  : 'bg-emerald-800/80 text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              Browse Published Events ({publishedEvents.length})
            </button>
            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth();
                } else {
                  setActiveView('my-registrations');
                }
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'my-registrations'
                  ? 'bg-white text-emerald-900 shadow-md'
                  : 'bg-emerald-800/80 text-emerald-100 hover:bg-emerald-800'
              }`}
            >
              My Booked Registrations ({currentUser ? myRegistrationsList.length : '0'})
            </button>
          </div>
        </div>
      </div>

      {/* VIEW: MY REGISTRATIONS */}
      {activeView === 'my-registrations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-emerald-600" />
                <span>My Booked Registrations</span>
              </h3>
              <p className="text-xs text-slate-500">
                Manage your confirmed passes and cancel bookings if your schedule changes.
              </p>
            </div>
            <button
              onClick={() => setActiveView('events')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Browse more events <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!currentUser ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Ticket className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">
                Sign In to View Your Registrations
              </h4>
              <p className="text-xs text-slate-600">
                You need to be logged into your attendee account to view booked tickets and cancel passes.
              </p>
              <button
                onClick={onOpenAuth}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                Sign In / Sign Up
              </button>
            </div>
          ) : myRegistrationsList.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-xs max-w-lg mx-auto space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Ticket className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">No Active Registrations</h4>
              <p className="text-xs text-slate-500">
                You haven't reserved any spots for upcoming events yet. Check out the published events below!
              </p>
              <button
                onClick={() => setActiveView('events')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                Explore Events
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myRegistrationsList.map(({ registration, event }) => {
                const { date, time } = formatDate(event.event_date);
                return (
                  <div
                    key={registration.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                          Confirmed Pass
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ID: {registration.id.slice(0, 8)}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                        {event.title}
                      </h4>

                      <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            {date} {time && `• ${time}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Booked for:{' '}
                        <strong className="text-slate-700">
                          {currentUser.profile?.full_name || currentUser.email}
                        </strong>
                      </span>
                      <button
                        onClick={() =>
                          setCancelModalReg({ id: registration.id, title: event.title })
                        }
                        className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Booking</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: BROWSE EVENTS */}
      {activeView === 'events' && (
        <div className="space-y-5">
          {/* Search & Filter Header */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search events by title, topic or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Showing {filteredEvents.length} published events</span>
            </div>
          </div>

          {/* Events Grid */}
          {filteredEvents.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs max-w-md mx-auto space-y-3">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">No Published Events Found</h4>
              <p className="text-xs text-slate-500">
                {searchQuery
                  ? `No events match "${searchQuery}". Try a different keyword.`
                  : 'There are currently no events published. Please check back soon or login as admin to publish new events.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => {
                const regCount = eventRegistrationsCount[event.id] || 0;
                const remainingSpots = Math.max(0, event.capacity - regCount);
                const isRegistered = userRegisteredEventIds.has(event.id);
                const isFull = remainingSpots <= 0;
                const percentFull = Math.min(100, Math.round((regCount / event.capacity) * 100));
                const { date, time } = formatDate(event.event_date);
                const isPast = isEventPast(event.event_date);
                const isCancelled = event.status === 'cancelled';
                const isCompleted = event.status === 'completed';
                const isEndedOrClosed = isPast || isCancelled || isCompleted;

                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Card Top / Header */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        {isCancelled ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 uppercase tracking-wide">
                            Cancelled
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase tracking-wide">
                            Completed
                          </span>
                        ) : isPast ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 uppercase tracking-wide">
                            Past Event
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                            Published
                          </span>
                        )}

                        {/* Remaining spots or Status badge */}
                        {isCancelled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Closed
                          </span>
                        ) : isPast || isCompleted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Event Ended
                          </span>
                        ) : isFull ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Sold Out
                          </span>
                        ) : remainingSpots <= 5 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Only {remainingSpots} left!
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                            {remainingSpots} spots remaining
                          </span>
                        )}
                      </div>

                      <h4 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {event.title}
                      </h4>

                      <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {event.description || 'No description provided for this event.'}
                      </p>

                      <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800">
                            {date} {time && `at ${time}`}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-slate-700 line-clamp-1">{event.location}</span>
                        </div>
                      </div>

                      {/* Capacity Progress Bar */}
                      <div className="space-y-1 pt-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {regCount} / {event.capacity} registered
                            </span>
                          </span>
                          <span className="font-medium text-slate-700">{percentFull}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentFull >= 100
                                ? 'bg-rose-500'
                                : percentFull >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percentFull}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="p-5 pt-0">
                      {isEndedOrClosed ? (
                        <div className="space-y-2">
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200 flex items-center justify-center gap-1.5 select-none"
                          >
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{isCancelled ? 'Closed' : 'Event Ended'}</span>
                          </button>
                          {isRegistered && (
                            <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                                <Check className="w-3 h-3" /> Registered pass on file
                              </span>
                              <button
                                onClick={() => setActiveView('my-registrations')}
                                className="underline hover:text-slate-800 font-medium"
                              >
                                View Details
                              </button>
                            </div>
                          )}
                        </div>
                      ) : isRegistered ? (
                        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-800">
                          <span className="flex items-center gap-1.5 font-semibold">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Registered
                          </span>
                          <button
                            onClick={() => setActiveView('my-registrations')}
                            className="text-[11px] underline font-medium hover:text-emerald-950"
                          >
                            View Pass
                          </button>
                        </div>
                      ) : isFull ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed border border-slate-200"
                        >
                          Registration Closed (Full)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRegisterClick(event.id)}
                          disabled={registeringId === event.id}
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                        >
                          {registeringId === event.id ? (
                            <span>Securing your spot...</span>
                          ) : (
                            <>
                              <Ticket className="w-4 h-4" />
                              <span>{currentUser ? 'Register Now' : 'Sign In to Register'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Booking Cancellation */}
      {cancelModalReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">Cancel Registration?</h4>
              <p className="text-xs text-slate-500">
                Are you sure you want to cancel your spot for <br />
                <strong className="text-slate-800">"{cancelModalReg.title}"</strong>?
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Your ticket will be released to other attendees immediately.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setCancelModalReg(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={confirmCancelRegistration}
                disabled={cancellingId === cancelModalReg.id}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
              >
                {cancellingId === cancelModalReg.id ? 'Cancelling...' : 'Yes, Cancel Pass'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
