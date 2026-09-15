import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Globe, Code2, ChevronDown, ChevronUp } from 'lucide-react';
import { getStoredSupabaseConfig, saveStoredSupabaseConfig, clearStoredSupabaseConfig, getSupabaseClient } from '../lib/supabase';

interface SupabaseConfigBarProps {
  onConfigChange: () => void;
  isSupabaseConnected: boolean;
  isCheckingConnection: boolean;
  onOpenSqlModal: () => void;
  connectionError: string | null;
}

export const SupabaseConfigBar: React.FC<SupabaseConfigBarProps> = ({
  onConfigChange,
  isSupabaseConnected,
  isCheckingConnection,
  onOpenSqlModal,
  connectionError,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const stored = getStoredSupabaseConfig();
    setUrl(stored.url);
    setAnonKey(stored.anonKey);
    // If already connected, default to collapsed to give maximum room to the event UI
    if (stored.url && stored.anonKey) {
      setIsExpanded(false);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSupabaseConfig(url, anonKey);
    onConfigChange();
  };

  const handleClear = () => {
    clearStoredSupabaseConfig();
    setUrl('');
    setAnonKey('');
    onConfigChange();
  };

  return (
    <div className="bg-slate-900 text-slate-100 border-b border-slate-800 shadow-md transition-all">
      {/* Top Banner / Summary */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Supabase Connection:</span>
          </div>

          {isCheckingConnection ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
              <RefreshCw className="w-3 h-3 animate-spin" /> Verifying...
            </span>
          ) : isSupabaseConnected ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Live Supabase Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium border border-slate-600">
              <AlertCircle className="w-3 h-3 text-amber-400" /> Demo Sandbox Mode (Enter keys to connect)
            </span>
          )}

          {url && (
            <span className="hidden md:inline-block text-slate-400 truncate max-w-xs font-mono">
              {url}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSqlModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 transition-colors"
            title="View database creation SQL"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>SQL Schema Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <span>{isExpanded ? 'Hide Settings' : 'Configure Supabase Keys'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Credentials Form */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 bg-slate-950/60 px-4 sm:px-6 py-4 animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto">
            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5 space-y-1">
                <label className="block text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" /> Supabase Project URL
                  </span>
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="md:col-span-5 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" /> Supabase Anon Key
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                  >
                    {showKey ? 'Mask Key' : 'Reveal Key'}
                  </button>
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isCheckingConnection || !url.trim() || !anonKey.trim()}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
                >
                  {isCheckingConnection ? 'Connecting...' : 'Connect'}
                </button>
                {(url || anonKey) && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors border border-slate-700"
                    title="Clear credentials and use demo mode"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {connectionError && (
              <div className="mt-2.5 p-2 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Connection Notice: </span>
                  <span>{connectionError}</span>
                  <p className="mt-0.5 text-slate-400 text-[11px]">
                    Tip: Make sure you ran the SQL script in your Supabase SQL editor to create the <code className="text-emerald-300">profiles</code>, <code className="text-emerald-300">events</code>, and <code className="text-emerald-300">registrations</code> tables.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
