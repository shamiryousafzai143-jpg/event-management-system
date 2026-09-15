export type UserRole = 'attendee' | 'admin';

export type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled';

export interface Profile {
  id: string; // uuid from auth.users
  full_name: string;
  role: UserRole;
  email?: string;
}

export interface EventItem {
  id: string; // uuid
  title: string;
  description: string;
  event_date: string; // ISO timestamp
  location: string;
  capacity: number; // positive integer
  status: EventStatus;
  created_at?: string;
}

export interface Registration {
  id: string; // uuid
  event_id: string;
  user_id: string;
  created_at?: string;
  // Joined fields for display
  event?: EventItem;
  profile?: Profile;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile | null;
}
