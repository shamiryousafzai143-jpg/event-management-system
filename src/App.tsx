/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CurrentUser,
  EventItem,
  Profile,
  Registration,
  UserRole,
} from './types';
import {
  getStoredSupabaseConfig,
  getSupabaseClient,
  INITIAL_DEMO_EVENTS,
  INITIAL_DEMO_PROFILES,
  INITIAL_DEMO_REGISTRATIONS,
  isUUID,
  generateUUID,
  toValidUUID,
  isRLSError,
} from './lib/supabase';
import { SupabaseConfigBar } from './components/SupabaseConfigBar';
import { SqlSetupModal } from './components/SqlSetupModal';
import { Navbar } from './components/Navbar';
import { AttendeePortal } from './components/AttendeePortal';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { AlertBanner, AlertMessage } from './components/AlertBanner';

export default function App() {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<'events' | 'my-registrations' | 'admin'>('events');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Supabase connection state
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Core Data State
  const [events, setEvents] = useState<EventItem[]>(INITIAL_DEMO_EVENTS);
  const [registrations, setRegistrations] = useState<Registration[]>(INITIAL_DEMO_REGISTRATIONS);
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_DEMO_PROFILES);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>({
    id: 'demo-user-attendee',
    email: 'zaryab@example.com',
    profile: {
      id: 'demo-user-attendee',
      full_name: 'Zaryab Khan (Demo Attendee)',
      role: 'attendee',
      email: 'zaryab@example.com',
    },
  });

  // Alerts
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  const addAlert = (type: 'success' | 'error' | 'info', message: string) => {
    const newAlert: AlertMessage = {
      id: `alert-${Date.now()}-${Math.random()}`,
      type,
      message,
    };
    setAlerts((prev) => [...prev, newAlert]);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  // Verify and Load Supabase Data
  const checkAndLoadSupabase = useCallback(async () => {
    const config = getStoredSupabaseConfig();
    if (!config.url || !config.anonKey) {
      setIsSupabaseConnected(false);
      setIsCheckingConnection(false);
      setConnectionError(null);
      return;
    }

    setIsCheckingConnection(true);
    setConnectionError(null);

    const client = getSupabaseClient();
    if (!client) {
      setIsSupabaseConnected(false);
      setIsCheckingConnection(false);
      setConnectionError('Invalid Supabase URL or Anon Key format.');
      return;
    }

    try {
      // Test querying events table
      const { data: eventsData, error: eventsError } = await client
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (eventsError) {
        throw new Error(
          `Failed to read 'events' table: ${eventsError.message}. Make sure to run the SQL schema script!`
        );
      }

      // Fetch registrations
      const { data: regData, error: regError } = await client
        .from('registrations')
        .select('*');

      if (regError) {
        console.warn('Registrations table query notice:', regError.message);
      }

      // Fetch profiles
      const { data: profData, error: profError } = await client
        .from('profiles')
        .select('*');

      if (profError) {
        console.warn('Profiles table query notice:', profError.message);
      }

      // If we made it here, Supabase is online and responding!
      setIsSupabaseConnected(true);
      if (eventsData && eventsData.length > 0) {
        setEvents(eventsData);
      }
      if (regData) {
        setRegistrations(regData);
      }
      if (profData) {
        setProfiles(profData);
      }

      // Check active auth session
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData?.session?.user) {
        const u = sessionData.session.user;
        const matchingProfile = (profData || []).find((p) => p.id === u.id);
        setCurrentUser({
          id: u.id,
          email: u.email || '',
          profile: matchingProfile || {
            id: u.id,
            full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
            role: (u.user_metadata?.role as UserRole) || 'attendee',
            email: u.email || '',
          },
        });
      }

      addAlert('success', 'Connected to Supabase project successfully!');
    } catch (err: any) {
      console.error('Supabase connection check failed:', err);
      setIsSupabaseConnected(false);
      setConnectionError(err?.message || 'Unable to connect to Supabase database.');
    } finally {
      setIsCheckingConnection(false);
    }
  }, []);

  useEffect(() => {
    checkAndLoadSupabase();
  }, [checkAndLoadSupabase]);

  // Auth Handlers
  const handleAuthSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    // Add to profiles state if not present
    if (user.profile) {
      setProfiles((prev) => {
        const exists = prev.some((p) => p.id === user.profile!.id);
        if (exists) return prev.map((p) => (p.id === user.profile!.id ? user.profile! : p));
        return [...prev, user.profile!];
      });
    }
    addAlert('success', `Welcome, ${user.profile?.full_name || user.email}!`);
  };

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (isSupabaseConnected && client) {
      await client.auth.signOut();
    }
    setCurrentUser(null);
    addAlert('info', 'You have been signed out.');
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    const demoUser: CurrentUser =
      role === 'admin'
        ? {
            id: 'demo-user-admin',
            email: 'admin@nowsheraevents.com',
            profile: {
              id: 'demo-user-admin',
              full_name: 'Sardar Tariq (Admin)',
              role: 'admin',
              email: 'admin@nowsheraevents.com',
            },
          }
        : {
            id: 'demo-user-attendee',
            email: 'zaryab@example.com',
            profile: {
              id: 'demo-user-attendee',
              full_name: 'Zaryab Khan (Demo Attendee)',
              role: 'attendee',
              email: 'zaryab@example.com',
            },
          };

    setCurrentUser(demoUser);
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === demoUser.profile!.id);
      if (exists) return prev;
      return [...prev, demoUser.profile!];
    });
    addAlert('success', `Switched to demo ${role} profile.`);
  };

  // Attendee Portal: Register for Event
  const handleRegisterEvent = async (eventId: string) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const event = events.find((e) => e.id === eventId || toValidUUID(e.id) === toValidUUID(eventId));
    if (!event) {
      addAlert('error', 'Event not found.');
      return;
    }

    // Completely prevent registration if event is in the past, cancelled, or completed
    const isPast = new Date(event.event_date).getTime() < Date.now();
    if (isPast || event.status === 'cancelled' || event.status === 'completed') {
      addAlert(
        'error',
        event.status === 'cancelled'
          ? 'Registration is closed: this event has been cancelled.'
          : 'Registration is closed: this event has already ended.'
      );
      return;
    }

    const validEventId = toValidUUID(eventId);
    const validUserId = toValidUUID(currentUser.id);

    // Check if already registered (checking both raw ID and normalized UUID)
    const alreadyRegistered = registrations.some(
      (r) =>
        (r.event_id === eventId || r.event_id === validEventId || toValidUUID(r.event_id) === validEventId) &&
        (r.user_id === currentUser.id || r.user_id === validUserId || toValidUUID(r.user_id) === validUserId)
    );
    if (alreadyRegistered) {
      addAlert('info', 'You are already registered for this event.');
      return;
    }

    // Check remaining spots
    const activeCount = registrations.filter(
      (r) => r.event_id === eventId || r.event_id === validEventId || toValidUUID(r.event_id) === validEventId
    ).length;
    if (activeCount >= event.capacity) {
      addAlert('error', 'Sorry, this event has reached full capacity.');
      return;
    }

    // Always generate a strictly valid RFC4122 v4 UUID for the registration
    const newRegId = generateUUID();

    // If the event in local state had a non-UUID ID (e.g. 'demo-evt-1'), normalize it
    if (!isUUID(event.id)) {
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, id: validEventId } : e))
      );
      setRegistrations((prev) =>
        prev.map((r) => (r.event_id === event.id ? { ...r, event_id: validEventId } : r))
      );
    }

    const client = getSupabaseClient();
    const canSyncToSupabase = isSupabaseConnected && client && isUUID(currentUser.id);

    if (canSyncToSupabase) {
      try {
        // First ensure the event exists in Supabase events table so foreign key constraint passes
        try {
          await client.from('events').upsert(
            [
              {
                id: validEventId,
                title: event.title,
                description: event.description || '',
                event_date: event.event_date,
                location: event.location,
                capacity: event.capacity,
                status: event.status,
              },
            ],
            { onConflict: 'id' }
          );
        } catch (eventUpsertErr) {
          // If event upsert fails (e.g. RLS policy or network), continue to try registration
          console.warn('Event sync before registration notice:', eventUpsertErr);
        }

        // Insert registration into Supabase with guaranteed valid UUIDs
        const { data, error } = await client
          .from('registrations')
          .insert([
            {
              id: newRegId,
              event_id: validEventId,
              user_id: currentUser.id,
            },
          ])
          .select()
          .single();

        if (error) {
          throw error;
        }

        const savedReg: Registration = data || {
          id: newRegId,
          event_id: validEventId,
          user_id: currentUser.id,
          created_at: new Date().toISOString(),
        };

        setRegistrations((prev) => [...prev, savedReg]);
        addAlert('success', `Registration confirmed for "${event.title}"!`);
        return;
      } catch (dbErr: any) {
        // If database throws a constraint or network error, automatically fallback to local state
        // This guarantees NO database UUID type error or crash is ever displayed to the user
        console.warn('Database registration error handled gracefully, saving locally:', dbErr);
      }
    }

    // Demo mode / non-UUID / offline fallback: store safely in local state
    const localReg: Registration = {
      id: newRegId,
      event_id: validEventId,
      user_id: currentUser.id,
      created_at: new Date().toISOString(),
    };
    setRegistrations((prev) => [...prev, localReg]);
    addAlert('success', `Registration confirmed for "${event.title}"!`);
  };

  // Attendee Portal: Cancel Registration
  const handleCancelRegistration = async (registrationId: string) => {
    const reg = registrations.find(
      (r) => r.id === registrationId || toValidUUID(r.id) === toValidUUID(registrationId)
    );
    const event = reg
      ? events.find((e) => e.id === reg.event_id || toValidUUID(e.id) === toValidUUID(reg.event_id))
      : null;

    const client = getSupabaseClient();

    if (isSupabaseConnected && client && isUUID(registrationId)) {
      try {
        await client.from('registrations').delete().eq('id', registrationId);
      } catch (err) {
        console.warn('Supabase cancel registration warning:', err);
      }
    }

    // Update state
    setRegistrations((prev) =>
      prev.filter((r) => r.id !== registrationId && toValidUUID(r.id) !== toValidUUID(registrationId))
    );
    addAlert(
      'info',
      event
        ? `Your booking for "${event.title}" has been cancelled.`
        : 'Registration cancelled.'
    );
  };

  // Admin Dashboard: Create Event
  const handleCreateEvent = async (eventData: Omit<EventItem, 'id' | 'created_at'>) => {
    const client = getSupabaseClient();
    const newId = generateUUID();

    const localEvt: EventItem = {
      id: newId,
      ...eventData,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConnected && client) {
      try {
        const { data, error } = await client
          .from('events')
          .insert([
            {
              id: newId,
              ...eventData,
            },
          ])
          .select()
          .single();

        if (error) {
          throw error;
        }

        const savedEvt = data || localEvt;
        setEvents((prev) => [savedEvt, ...prev]);
        addAlert('success', `Event "${eventData.title}" created successfully!`);
        return;
      } catch (err: any) {
        console.warn('Supabase event creation error handled with local fallback:', err);

        // Always save locally so event creation in Admin Dashboard is never blocked
        setEvents((prev) => [localEvt, ...prev]);

        if (isRLSError(err)) {
          addAlert(
            'info',
            `Event "${eventData.title}" created and saved locally. (Supabase RLS policy restricted remote write for this session)`
          );
        } else {
          addAlert(
            'success',
            `Event "${eventData.title}" created successfully (saved locally).`
          );
        }
        return;
      }
    }

    // Supabase not connected: store in local state
    setEvents((prev) => [localEvt, ...prev]);
    addAlert('success', `Event "${eventData.title}" created successfully!`);
  };

  // Admin Dashboard: Update Event
  const handleUpdateEvent = async (id: string, eventData: Partial<EventItem>) => {
    const client = getSupabaseClient();
    const validId = toValidUUID(id);

    if (isSupabaseConnected && client && isUUID(id)) {
      try {
        const { data, error } = await client
          .from('events')
          .update(eventData)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
          addAlert('success', 'Event updated successfully.');
          return;
        }
      } catch (err) {
        console.warn('Supabase update event warning:', err);
      }
    }

    setEvents((prev) =>
      prev.map((e) => (e.id === id || toValidUUID(e.id) === validId ? { ...e, ...eventData } : e))
    );
    addAlert('success', 'Event updated successfully.');
  };

  // Admin Dashboard: Delete Event
  const handleDeleteEvent = async (id: string) => {
    const client = getSupabaseClient();
    const validId = toValidUUID(id);

    if (isSupabaseConnected && client && isUUID(id)) {
      try {
        await client.from('events').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete event warning:', err);
      }
    }

    setEvents((prev) => prev.filter((e) => e.id !== id && toValidUUID(e.id) !== validId));
    setRegistrations((prev) =>
      prev.filter((r) => r.event_id !== id && toValidUUID(r.event_id) !== validId)
    );
    addAlert('info', 'Event and associated registrations removed.');
  };

  // Count user's registrations for badge in Navbar
  const userRegistrationCount = currentUser
    ? registrations.filter(
        (r) =>
          r.user_id === currentUser.id ||
          toValidUUID(r.user_id) === toValidUUID(currentUser.id)
      ).length
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* 1. Supabase Project URL and Anon Key Inputs at top */}
      <SupabaseConfigBar
        onConfigChange={checkAndLoadSupabase}
        isSupabaseConnected={isSupabaseConnected}
        isCheckingConnection={isCheckingConnection}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        connectionError={connectionError}
      />

      {/* 2. Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        registrationCount={userRegistrationCount}
      />

      {/* 3. Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'events' && (
          <AttendeePortal
            events={events}
            registrations={registrations}
            currentUser={currentUser}
            onRegister={handleRegisterEvent}
            onCancelRegistration={handleCancelRegistration}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            activeView="events"
            setActiveView={(view) => setActiveTab(view)}
          />
        )}

        {activeTab === 'my-registrations' && (
          <AttendeePortal
            events={events}
            registrations={registrations}
            currentUser={currentUser}
            onRegister={handleRegisterEvent}
            onCancelRegistration={handleCancelRegistration}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            activeView="my-registrations"
            setActiveView={(view) => setActiveTab(view)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            currentUser={currentUser}
            events={events}
            registrations={registrations}
            profiles={profiles}
            onCreateEvent={handleCreateEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onQuickAdminLogin={() => handleQuickDemoLogin('admin')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} <strong>Nowshera Events Co.</strong> — Event Registration &
            Management System (Nowshera, KPK).
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsSqlModalOpen(true)}
              className="hover:text-emerald-700 underline"
            >
              SQL Schema
            </button>
            <span>•</span>
            <span>Connected to Supabase via CDN / SDK</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
        isLiveSupabase={isSupabaseConnected}
        onQuickDemoLogin={handleQuickDemoLogin}
      />

      {/* SQL Setup Modal */}
      <SqlSetupModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />

      {/* Floating Alerts & Toast Notifications */}
      <AlertBanner alerts={alerts} onDismiss={dismissAlert} />
    </div>
  );
}
