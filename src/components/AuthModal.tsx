import React, { useState } from 'react';
import { CurrentUser, UserRole } from '../types';
import { X, Lock, Mail, User, ShieldCheck, Ticket, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  onAuthSuccess: (user: CurrentUser) => void;
  isLiveSupabase: boolean;
  onQuickDemoLogin: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  isLiveSupabase,
  onQuickDemoLogin,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('attendee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    const client = getSupabaseClient();

    try {
      if (isLiveSupabase && client) {
        // Real Supabase Auth
        if (tab === 'signup') {
          if (!fullName.trim()) {
            throw new Error('Please enter your full name.');
          }
          if (password.length < 6) {
            throw new Error('Password should be at least 6 characters.');
          }

          const { data: authData, error: authError } = await client.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName.trim(),
                role: role,
              },
            },
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error('Sign up failed. Please try again.');

          // Insert or upsert into profiles table
          const { error: profileError } = await client.from('profiles').upsert([
            {
              id: authData.user.id,
              full_name: fullName.trim(),
              role: role,
            },
          ]);

          if (profileError) {
            console.warn('Profile table insert warning:', profileError);
            // Some Supabase instances might have email confirmation required or trigger
            // Still create current user object
          }

          const userObj: CurrentUser = {
            id: authData.user.id,
            email: authData.user.email || email,
            profile: {
              id: authData.user.id,
              full_name: fullName.trim(),
              role: role,
              email: authData.user.email || email,
            },
          };

          setSuccessMsg('Account registered successfully!');
          setTimeout(() => {
            onAuthSuccess(userObj);
            onClose();
          }, 800);
        } else {
          // Sign In
          const { data: authData, error: authError } = await client.auth.signInWithPassword({
            email,
            password,
          });

          if (authError) throw authError;
          if (!authData.user) throw new Error('Sign in failed. Please check your credentials.');

          // Query profile
          const { data: profileData, error: profileErr } = await client
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          const userRole: UserRole = profileData?.role === 'admin' ? 'admin' : 'attendee';
          const userName: string = profileData?.full_name || authData.user.email?.split('@')[0] || 'User';

          const userObj: CurrentUser = {
            id: authData.user.id,
            email: authData.user.email || email,
            profile: {
              id: authData.user.id,
              full_name: userName,
              role: userRole,
              email: authData.user.email || email,
            },
          };

          onAuthSuccess(userObj);
          onClose();
        }
      } else {
        // Demo sandbox mode
        if (tab === 'signup') {
          if (!fullName.trim()) throw new Error('Please enter your full name.');
          const demoUser: CurrentUser = {
            id: `demo-${Date.now()}`,
            email: email || 'user@example.com',
            profile: {
              id: `demo-${Date.now()}`,
              full_name: fullName.trim(),
              role: role,
              email: email || 'user@example.com',
            },
          };
          onAuthSuccess(demoUser);
          onClose();
        } else {
          // Sign in demo
          const demoRole: UserRole = email.toLowerCase().includes('admin') ? 'admin' : role;
          const demoUser: CurrentUser = {
            id: `demo-user-${demoRole}`,
            email: email || (demoRole === 'admin' ? 'admin@nowsheraevents.com' : 'attendee@nowsheraevents.com'),
            profile: {
              id: `demo-user-${demoRole}`,
              full_name: demoRole === 'admin' ? 'Sardar Tariq (Admin)' : 'Zaryab Khan (Attendee)',
              role: demoRole,
              email: email || (demoRole === 'admin' ? 'admin@nowsheraevents.com' : 'attendee@nowsheraevents.com'),
            },
          };
          onAuthSuccess(demoUser);
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'Authentication failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase">
              Nowshera Events Co.
            </span>
            <h3 className="text-xl font-bold text-slate-900">
              {tab === 'signin' ? 'Sign In to Your Account' : 'Create an Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              tab === 'signin'
                ? 'border-emerald-600 text-emerald-700 font-semibold bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              tab === 'signup'
                ? 'border-emerald-600 text-emerald-700 font-semibold bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asad Khattak"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('attendee')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      role === 'attendee'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Ticket className="w-4 h-4 text-emerald-600" />
                    <span>Attendee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      role === 'admin'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Admin</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {role === 'admin'
                    ? 'Admins can create events, manage attendee lists, and export data.'
                    : 'Attendees can browse events, book spots, and view registrations.'}
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <span>{tab === 'signin' ? 'Sign In' : 'Create Profile & Sign Up'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Testing helper / Demo shortcuts */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Test Profiles:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onQuickDemoLogin('attendee');
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <Ticket className="w-3.5 h-3.5 text-emerald-600" />
              <span>Login as Attendee</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onQuickDemoLogin('admin');
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Login as Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
