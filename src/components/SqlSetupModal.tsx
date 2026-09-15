import React, { useState } from 'react';
import { SUPABASE_SETUP_SQL } from '../lib/supabase';
import { Check, Copy, Database, ExternalLink, X } from 'lucide-react';

interface SqlSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlSetupModal: React.FC<SqlSetupModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Supabase SQL Setup Script
              </h3>
              <p className="text-xs text-slate-500">
                Creates <code className="text-emerald-700 font-mono">profiles</code>,{' '}
                <code className="text-emerald-700 font-mono">events</code>, and{' '}
                <code className="text-emerald-700 font-mono">registrations</code> tables with RLS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>🚀</span> How to apply in Supabase:
            </p>
            <ol className="list-decimal list-inside space-y-0.5 ml-1 text-slate-700">
              <li>Open your Supabase Project dashboard.</li>
              <li>Go to <strong>SQL Editor</strong> in the left sidebar.</li>
              <li>Click <strong>New query</strong>, paste the script below, and click <strong>Run</strong>.</li>
            </ol>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between bg-slate-800 text-slate-300 px-4 py-2 rounded-t-xl text-xs font-mono">
              <span>supabase_schema.sql</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy SQL
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-950 text-emerald-400 p-4 rounded-b-xl overflow-x-auto text-xs font-mono max-h-72 leading-relaxed border-t border-slate-800">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 font-medium"
          >
            Go to Supabase Dashboard <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
