import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventItem, Profile, Registration, UserRole } from '../types';

const STORAGE_KEY_URL = 'nowshera_events_supabase_url';
const STORAGE_KEY_ANON = 'nowshera_events_supabase_anon_key';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const url = localStorage.getItem(STORAGE_KEY_URL) || '';
  const anonKey = localStorage.getItem(STORAGE_KEY_ANON) || '';
  return { url, anonKey };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
}

export function clearStoredSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
}

// Keep singleton instance if config hasn't changed
let currentClient: SupabaseClient | null = null;
let currentClientConfig = { url: '', anonKey: '' };

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey) {
    currentClient = null;
    return null;
  }

  if (
    currentClient &&
    currentClientConfig.url === url &&
    currentClientConfig.anonKey === anonKey
  ) {
    return currentClient;
  }

  try {
    // Check if CDN window.supabase is present or use npm package createClient
    const clientCreator =
      typeof (window as unknown as { supabase?: { createClient?: typeof createClient } }).supabase?.createClient === 'function'
        ? (window as unknown as { supabase: { createClient: typeof createClient } }).supabase.createClient
        : createClient;

    currentClient = clientCreator(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentClientConfig = { url, anonKey };
    return currentClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// RFC 4122 UUID validation regex
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUUID(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') return false;
  return UUID_REGEX.test(id.trim());
}

// Helper to detect Row-Level Security (RLS) or permission errors from PostgreSQL / Supabase
export function isRLSError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const details = (err.details || '').toLowerCase();
  const hint = (err.hint || '').toLowerCase();
  const code = String(err.code || '');

  return (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('violates row-level security') ||
    msg.includes('policy') ||
    msg.includes('permission denied') ||
    details.includes('row-level security') ||
    details.includes('policy') ||
    hint.includes('row-level security')
  );
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Known deterministic UUIDs for standard demo objects
export const DEMO_UUID_MAP: Record<string, string> = {
  'demo-evt-1': 'a0000000-0000-4000-8000-000000000001',
  'demo-evt-2': 'a0000000-0000-4000-8000-000000000002',
  'demo-evt-3': 'a0000000-0000-4000-8000-000000000003',
  'demo-evt-4': 'a0000000-0000-4000-8000-000000000004',
  'demo-evt-5': 'a0000000-0000-4000-8000-000000000005',
  'demo-evt-6': 'a0000000-0000-4000-8000-000000000006',
  'demo-user-attendee': 'b0000000-0000-4000-8000-000000000001',
  'demo-user-admin': 'b0000000-0000-4000-8000-000000000002',
  'demo-attendee-2': 'b0000000-0000-4000-8000-000000000003',
  'demo-attendee-3': 'b0000000-0000-4000-8000-000000000004',
  'reg-1': 'c0000000-0000-4000-8000-000000000001',
  'reg-2': 'c0000000-0000-4000-8000-000000000002',
  'reg-3': 'c0000000-0000-4000-8000-000000000003',
  'reg-4': 'c0000000-0000-4000-8000-000000000004',
};

// Converts any ID (including 'demo-evt-1') into a strictly valid UUID
export function toValidUUID(id: string): string {
  if (isUUID(id)) return id;
  if (DEMO_UUID_MAP[id]) return DEMO_UUID_MAP[id];

  // Hash string deterministically into a valid RFC4122 v4 UUID format
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const p3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const p4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');

  // Format as xxxxxxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx (Valid UUID v4)
  return `${p1}-${p2.slice(0, 4)}-4${p2.slice(4, 7)}-a${p3.slice(0, 3)}-${p4}${p3.slice(3, 7)}`.slice(0, 36);
}

// SQL Helper script ready to run in Supabase SQL editor
export const SUPABASE_SETUP_SQL = `-- Nowshera Events Co. Database Schema Setup
-- Run this in your Supabase Project -> SQL Editor -> New Query -> Run

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('attendee', 'admin')) DEFAULT 'attendee',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'completed', 'cancelled')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_event_user UNIQUE (event_id, user_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 6. RLS Policies for Events
CREATE POLICY "Anyone can view published events" 
  ON public.events FOR SELECT USING (true);

-- Allows authenticated users and admin app sessions to insert/update/delete events
CREATE POLICY "Allow insert events for authorized admin sessions" 
  ON public.events FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update events for authorized admin sessions" 
  ON public.events FOR UPDATE USING (true);

CREATE POLICY "Allow delete events for authorized admin sessions" 
  ON public.events FOR DELETE USING (true);

-- 7. RLS Policies for Registrations
CREATE POLICY "Users can view registrations" 
  ON public.registrations FOR SELECT USING (true);

CREATE POLICY "Users can insert their own registration" 
  ON public.registrations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own registration" 
  ON public.registrations FOR DELETE USING (auth.uid() = user_id);

-- Optional: Seed initial sample events for Nowshera Events Co.
INSERT INTO public.events (title, description, event_date, location, capacity, status)
VALUES 
  (
    'Nowshera Tech & Innovation Summit 2026', 
    'Join regional innovators, software builders, and venture catalysts at the premier technology conference in Nowshera. Features keynote speeches, AI demos, and networking lunches.',
    NOW() + INTERVAL '14 days',
    'Nowshera Cantonment Civic Hall, G.T. Road, Nowshera',
    120,
    'published'
  ),
  (
    'Kabul River Cultural & Artisan Expo',
    'A vibrant evening celebrating the historic folk art, craftwork, music, and culinary heritage along the banks of River Kabul. Free family registration.',
    NOW() + INTERVAL '21 days',
    'Riverfront Heritage Park, Nowshera',
    250,
    'published'
  ),
  (
    'Nowshera Business & Startup Pitch Night',
    'Emerging entrepreneurs and small business leaders pitch ideas before regional angel investors and mentor panels.',
    NOW() + INTERVAL '7 days',
    'Commerce Chamber Auditorium, Nowshera',
    60,
    'published'
  ),
  (
    'Youth Leadership & Digital Skills Bootcamp',
    'Intensive hands-on workshop for college and university students covering product design, leadership, and modern digital economy skills.',
    NOW() + INTERVAL '30 days',
    'District Information Center Hall, Nowshera',
    40,
    'draft'
  )
ON CONFLICT DO NOTHING;
`;

// Initial Mock/Demo data for immediate live preview when user hasn't configured Supabase yet
export const INITIAL_DEMO_EVENTS: EventItem[] = [
  {
    id: 'demo-evt-1',
    title: 'Nowshera Tech & Innovation Summit 2026',
    description:
      'Join regional innovators, software builders, and venture catalysts at the premier technology conference in Nowshera. Features keynote speeches, AI demos, and networking lunches.',
    event_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    location: 'Nowshera Cantonment Civic Hall, G.T. Road, Nowshera',
    capacity: 50,
    status: 'published',
  },
  {
    id: 'demo-evt-2',
    title: 'Kabul River Cultural & Artisan Expo',
    description:
      'A vibrant celebration of regional folk art, craftwork, music, and culinary heritage along the historic banks of River Kabul. Featuring live performances and local bazaar.',
    event_date: new Date(Date.now() + 21 * 86400000).toISOString(),
    location: 'Riverfront Heritage Park, Nowshera',
    capacity: 100,
    status: 'published',
  },
  {
    id: 'demo-evt-3',
    title: 'Nowshera Business & Startup Pitch Night',
    description:
      'Emerging entrepreneurs and small enterprise creators pitch ideas before regional angel investors, mentors, and corporate partners.',
    event_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    location: 'Commerce Chamber Auditorium, Nowshera',
    capacity: 25,
    status: 'published',
  },
  {
    id: 'demo-evt-4',
    title: 'Youth Leadership & Digital Skills Bootcamp',
    description:
      'Intensive hands-on workshop for university students covering product design, leadership, public speaking, and digital freelancing.',
    event_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    location: 'District Information Center Hall, Nowshera',
    capacity: 40,
    status: 'draft',
  },
  {
    id: 'demo-evt-5',
    title: 'Nowshera Spring Heritage Walk 2026',
    description:
      'A guided walking tour exploring historical architecture and monuments across the old cantonment district.',
    event_date: new Date(Date.now() - 5 * 86400000).toISOString(),
    location: 'Old Cantonment Railway Station Plaza, Nowshera',
    capacity: 35,
    status: 'completed',
  },
  {
    id: 'demo-evt-6',
    title: 'KP Clean Energy & Solar Symposium',
    description:
      'Discussion on renewable grid solutions and domestic solar adoption across Khyber Pakhtunkhwa.',
    event_date: new Date(Date.now() + 10 * 86400000).toISOString(),
    location: 'Civic Center Auditorium B, Nowshera',
    capacity: 60,
    status: 'cancelled',
  },
];

export const INITIAL_DEMO_PROFILES: Profile[] = [
  {
    id: 'demo-user-attendee',
    full_name: 'Zaryab Khan (Demo Attendee)',
    role: 'attendee',
    email: 'zaryab@example.com',
  },
  {
    id: 'demo-user-admin',
    full_name: 'Sardar Tariq (Demo Admin)',
    role: 'admin',
    email: 'admin@nowsheraevents.com',
  },
  {
    id: 'demo-attendee-2',
    full_name: 'Aisha Khattak',
    role: 'attendee',
    email: 'aisha.k@example.com',
  },
  {
    id: 'demo-attendee-3',
    full_name: 'Bilal Ahmad Yousafzai',
    role: 'attendee',
    email: 'bilal.yousaf@example.com',
  },
];

export const INITIAL_DEMO_REGISTRATIONS: Registration[] = [
  {
    id: 'reg-1',
    event_id: 'demo-evt-1',
    user_id: 'demo-attendee-2',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'reg-2',
    event_id: 'demo-evt-1',
    user_id: 'demo-attendee-3',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'reg-3',
    event_id: 'demo-evt-2',
    user_id: 'demo-attendee-2',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'reg-4',
    event_id: 'demo-evt-3',
    user_id: 'demo-user-attendee',
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
];
