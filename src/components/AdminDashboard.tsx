import React, { useState, useMemo } from 'react';
import { CurrentUser, EventItem, EventStatus, Profile, Registration } from '../types';
import { toValidUUID, isRLSError } from '../lib/supabase';
import {
  ShieldAlert,
  Plus,
  Calendar,
  MapPin,
  Users,
  Search,
  Copy,
  Download,
  Check,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronDown,
  Lock,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: CurrentUser | null;
  events: EventItem[];
  registrations: Registration[];
  profiles: Profile[];
  onCreateEvent: (eventData: Omit<EventItem, 'id' | 'created_at'>) => Promise<void>;
  onUpdateEvent: (id: string, eventData: Partial<EventItem>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onOpenAuth: () => void;
  onQuickAdminLogin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  events,
  registrations,
  profiles,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onOpenAuth,
  onQuickAdminLogin,
}) => {
  const isAdmin = currentUser?.profile?.role === 'admin';

  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Event form fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCapacity, setFormCapacity] = useState<number | string>(50);
  const [formStatus, setFormStatus] = useState<EventStatus>('draft');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Attendee list modal state
  const [attendeeModalEvent, setAttendeeModalEvent] = useState<EventItem | null>(null);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [copiedAttendeeList, setCopiedAttendeeList] = useState(false);

  // Filter/Search in Admin events table
  const [eventFilterStatus, setEventFilterStatus] = useState<string>('all');
  const [eventSearchQuery, setEventSearchQuery] = useState('');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Compute map of event_id -> registration list
  const eventRegistrationsMap = useMemo(() => {
    const map: Record<string, Registration[]> = {};
    events.forEach((e) => {
      map[e.id] = [];
      const validEId = toValidUUID(e.id);
      if (validEId !== e.id) {
        map[validEId] = map[e.id];
      }
    });
    registrations.forEach((r) => {
      if (map[r.event_id]) {
        map[r.event_id].push(r);
      } else {
        const validRId = toValidUUID(r.event_id);
        if (map[validRId]) {
          map[validRId].push(r);
        } else {
          map[r.event_id] = [r];
        }
      }
    });
    return map;
  }, [events, registrations]);

  // If not admin, render protection screen
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center mx-auto shadow-2xs">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              Role: Admin Only
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              Admin Access Protected
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              This dashboard is restricted to Nowshera Events Co. administrators. You are currently{' '}
              {currentUser ? (
                <>
                  signed in as an <strong className="text-slate-900 capitalize">{currentUser.profile?.role || 'Attendee'}</strong> ({currentUser.email}).
                </>
              ) : (
                'browsing as a guest.'
              )}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onQuickAdminLogin}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Switch to Admin Account</span>
            </button>
            <button
              onClick={onOpenAuth}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              Sign In with Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin stats
  const totalEvents = events.length;
  const publishedEventsCount = events.filter((e) => e.status === 'published').length;
  const totalRegistrationsCount = registrations.length;

  // Filtered events
  const filteredEvents = events.filter((e) => {
    const matchesStatus = eventFilterStatus === 'all' || e.status === eventFilterStatus;
    const matchesSearch =
      e.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(eventSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    // Default to tomorrow 10:00 AM
    const tomorrow = new Date(Date.now() + 86400000);
    tomorrow.setHours(10, 0, 0, 0);
    setFormDate(tomorrow.toISOString().slice(0, 16));
    setFormLocation('Nowshera Cantonment Civic Hall, Nowshera');
    setFormCapacity(50);
    setFormStatus('published');
    setFormError(null);
    setIsEventModalOpen(true);
  };

  const openEditModal = (evt: EventItem) => {
    setEditingEvent(evt);
    setFormTitle(evt.title);
    setFormDescription(evt.description || '');
    try {
      const d = new Date(evt.event_date);
      setFormDate(d.toISOString().slice(0, 16));
    } catch {
      setFormDate('');
    }
    setFormLocation(evt.location);
    setFormCapacity(evt.capacity);
    setFormStatus(evt.status);
    setFormError(null);
    setIsEventModalOpen(true);
  };

  const handleEventFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Capacity validation: MUST be a positive integer > 0
    const capacityNum = Number(formCapacity);
    if (isNaN(capacityNum) || !Number.isInteger(capacityNum) || capacityNum <= 0) {
      setFormError('Capacity must be a positive whole number greater than 0.');
      return;
    }

    if (!formTitle.trim()) {
      setFormError('Event title is required.');
      return;
    }

    if (!formDate) {
      setFormError('Event date and time is required.');
      return;
    }

    if (!formLocation.trim()) {
      setFormError('Event location is required.');
      return;
    }

    setSubmitting(true);
    try {
      const isoDate = new Date(formDate).toISOString();

      if (editingEvent) {
        await onUpdateEvent(editingEvent.id, {
          title: formTitle.trim(),
          description: formDescription.trim(),
          event_date: isoDate,
          location: formLocation.trim(),
          capacity: capacityNum,
          status: formStatus,
        });
      } else {
        await onCreateEvent({
          title: formTitle.trim(),
          description: formDescription.trim(),
          event_date: isoDate,
          location: formLocation.trim(),
          capacity: capacityNum,
          status: formStatus,
        });
      }
      setIsEventModalOpen(false);
    } catch (err: any) {
      console.error('Save event error:', err);
      // If an RLS or permission issue occurred, the event was already persisted locally
      // Close the modal cleanly rather than trapping the user with a blocked dialog
      if (isRLSError(err)) {
        setIsEventModalOpen(false);
      } else {
        setFormError(err?.message || 'Failed to save event. Please check inputs.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Status badge style helper
  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'published':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'draft':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // Attendees list for selected event
  const currentEventAttendees = useMemo(() => {
    if (!attendeeModalEvent) return [];
    const eventRegs =
      eventRegistrationsMap[attendeeModalEvent.id] ||
      eventRegistrationsMap[toValidUUID(attendeeModalEvent.id)] ||
      [];
    return eventRegs.map((reg) => {
      const profile = profiles.find(
        (p) => p.id === reg.user_id || toValidUUID(p.id) === toValidUUID(reg.user_id)
      );
      return {
        registrationId: reg.id,
        userId: reg.user_id,
        fullName: profile?.full_name || 'Anonymous Attendee',
        email: profile?.email || 'N/A',
        role: profile?.role || 'attendee',
        registeredAt: reg.created_at || 'Recently',
      };
    });
  }, [attendeeModalEvent, eventRegistrationsMap, profiles]);

  const filteredAttendees = useMemo(() => {
    const q = attendeeSearchQuery.toLowerCase().trim();
    if (!q) return currentEventAttendees;
    return currentEventAttendees.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.registrationId.toLowerCase().includes(q)
    );
  }, [currentEventAttendees, attendeeSearchQuery]);

  // Export Attendees to CSV
  const handleExportCsv = () => {
    if (!attendeeModalEvent) return;
    const headers = ['Registration ID', 'Full Name', 'Email', 'Role', 'Registered At'];
    const rows = filteredAttendees.map((a) => [
      `"${a.registrationId}"`,
      `"${a.fullName.replace(/"/g, '""')}"`,
      `"${a.email.replace(/"/g, '""')}"`,
      `"${a.role}"`,
      `"${a.registeredAt}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanTitle = attendeeModalEvent.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `attendees_${cleanTitle}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy Attendees to Clipboard
  const handleCopyAttendees = async () => {
    if (!attendeeModalEvent) return;
    const header = `Attendee List for: ${attendeeModalEvent.title}\nTotal: ${filteredAttendees.length} attendees\n\nName\tEmail\tRegistration ID\tDate\n`;
    const textRows = filteredAttendees
      .map((a) => `${a.fullName}\t${a.email}\t${a.registrationId}\t${a.registeredAt}`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(header + textRows);
      setCopiedAttendeeList(true);
      setTimeout(() => setCopiedAttendeeList(false), 2000);
    } catch {
      setCopiedAttendeeList(true);
      setTimeout(() => setCopiedAttendeeList(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Admin Welcome */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wide">
              Administrator Controls
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Signed in as: <strong className="text-slate-800">{currentUser.profile?.full_name || currentUser.email}</strong>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Nowshera Events Management Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish conferences, monitor live capacity, inspect attendee rosters, and download registrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Events
            </span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalEvents}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {publishedEventsCount} currently published to attendees
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Bookings
            </span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{totalRegistrationsCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Active attendee reservations confirmed</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Database Sync
            </span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{profiles.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Registered attendee & admin profiles</p>
        </div>
      </div>

      {/* Events Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search events..."
                value={eventSearchQuery}
                onChange={(e) => setEventSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <select
              value={eventFilterStatus}
              onChange={(e) => setEventFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium self-end sm:self-auto">
            Showing {filteredEvents.length} of {events.length} events
          </span>
        </div>

        {/* Table Body */}
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No events match your criteria</p>
            <p className="text-xs text-slate-400">Click "Create New Event" above to add one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/75 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4">Date & Venue</th>
                  <th className="py-3 px-4 text-center">Capacity & Registrations</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((evt) => {
                  const regCount = (eventRegistrationsMap[evt.id] || []).length;
                  const percent = Math.min(100, Math.round((regCount / evt.capacity) * 100));

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Details */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 text-sm">{evt.title}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {evt.description || 'No description'}
                        </div>
                      </td>

                      {/* Date & Venue */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {new Date(evt.event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {evt.location}
                        </div>
                      </td>

                      {/* Capacity & Registrations */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <button
                            onClick={() => {
                              setAttendeeModalEvent(evt);
                              setAttendeeSearchQuery('');
                            }}
                            className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 text-xs"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>
                              {regCount} / {evt.capacity}
                            </span>
                          </button>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percent >= 100 ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={evt.status}
                          onChange={(e) =>
                            onUpdateEvent(evt.id, { status: e.target.value as EventStatus })
                          }
                          className={`px-2 py-1 rounded-full text-[11px] font-semibold border focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer ${getStatusBadge(
                            evt.status
                          )}`}
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setAttendeeModalEvent(evt);
                              setAttendeeSearchQuery('');
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors flex items-center gap-1"
                            title="View registered attendees"
                          >
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Attendees</span>
                          </button>

                          <button
                            onClick={() => openEditModal(evt)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Event"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(evt.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEvent ? 'Edit Event Details' : 'Create New Event'}
              </h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEventFormSubmit} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nowshera Annual Innovation & AI Summit"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Details about the agenda, speakers, refreshments, and target audience..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capacity (Spots) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Must be a positive integer (&gt; 0).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location / Venue <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nowshera Cantonment Civic Hall, G.T. Road"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as EventStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="draft">Draft (Hidden from attendees)</option>
                    <option value="published">Published (Visible & bookable)</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving...'
                    : editingEvent
                    ? 'Update Event'
                    : 'Create & Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ATTENDEE LIST MODAL */}
      {attendeeModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    Attendee Roster
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500">
                    Capacity: {attendeeModalEvent.capacity}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1 leading-snug">
                  {attendeeModalEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setAttendeeModalEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls: Search, Copy, Export */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search attendees by name or email..."
                  value={attendeeSearchQuery}
                  onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleCopyAttendees}
                  disabled={filteredAttendees.length === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Copy formatted list to clipboard"
                >
                  {copiedAttendeeList ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy List</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportCsv}
                  disabled={filteredAttendees.length === 0}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                  title="Download attendee list as CSV file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto flex-1">
              {filteredAttendees.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <Users className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No attendees found</p>
                  <p className="text-xs text-slate-400">
                    {attendeeSearchQuery
                      ? 'No registered attendee matches your search filter.'
                      : 'No attendees have registered for this event yet.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAttendees.map((att, idx) => (
                    <div
                      key={att.registrationId}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                          {att.fullName[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{att.fullName}</div>
                          <div className="text-[11px] text-slate-500">{att.email}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-[10px] text-slate-400 block">
                          ID: {att.registrationId.slice(0, 8)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {att.registeredAt.includes('T')
                            ? new Date(att.registeredAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : att.registeredAt}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Total: <strong>{filteredAttendees.length}</strong> attendee
                {filteredAttendees.length === 1 ? '' : 's'}
              </span>
              <button
                onClick={() => setAttendeeModalEvent(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE EVENT CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900">Delete Event?</h4>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete this event? All associated attendee registrations
                will also be removed.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onDeleteEvent(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
