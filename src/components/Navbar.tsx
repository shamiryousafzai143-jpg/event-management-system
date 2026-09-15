import React from 'react';
import { CurrentUser } from '../types';
import { Calendar, User, ShieldCheck, Ticket, LogOut, LogIn, Sparkles, Building2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'events' | 'my-registrations' | 'admin';
  setActiveTab: (tab: 'events' | 'my-registrations' | 'admin') => void;
  currentUser: CurrentUser | null;
  onOpenAuth: () => void;
  onSignOut: () => void;
  registrationCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onSignOut,
  registrationCount,
}) => {
  const isAdmin = currentUser?.profile?.role === 'admin';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 flex items-center justify-center text-white shadow-sm ring-2 ring-emerald-600/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  Nowshera Events Co.
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  KPK Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Event Registration & Management System
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('events')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'events'
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Browse Events</span>
            </button>

            <button
              onClick={() => setActiveTab('my-registrations')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors relative ${
                activeTab === 'my-registrations'
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>My Registrations</span>
              {registrationCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                  {registrationCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                activeTab === 'admin'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Admin Dashboard</span>
              {isAdmin && (
                <span className="hidden md:inline-block w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              )}
            </button>
          </nav>

          {/* Auth & User status */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-800 max-w-[140px] truncate">
                    {currentUser.profile?.full_name || currentUser.email}
                  </span>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      isAdmin
                        ? 'bg-indigo-100 text-indigo-800 font-bold'
                        : 'bg-emerald-100 text-emerald-800 font-bold'
                    }`}
                  >
                    {currentUser.profile?.role || 'Attendee'}
                  </span>
                </div>

                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-2xs ${
                    isAdmin ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}
                  title={currentUser.profile?.full_name || currentUser.email}
                >
                  {(currentUser.profile?.full_name || currentUser.email || 'U')[0].toUpperCase()}
                </div>

                <button
                  onClick={onSignOut}
                  className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-colors shadow-2xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
