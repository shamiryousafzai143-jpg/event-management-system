import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface AlertMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AlertBannerProps {
  alerts: AlertMessage[];
  onDismiss: (id: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const AlertItem: React.FC<{ alert: AlertMessage; onDismiss: (id: string) => void }> = ({
  alert,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(alert.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [alert.id, onDismiss]);

  const bgStyles = {
    success: 'bg-emerald-900/95 border-emerald-700 text-white',
    error: 'bg-rose-900/95 border-rose-700 text-white',
    info: 'bg-slate-900/95 border-slate-700 text-white',
  }[alert.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }[alert.type];

  return (
    <div
      className={`pointer-events-auto border rounded-xl p-3.5 shadow-xl backdrop-blur-xs flex items-start gap-3 transition-all animate-in slide-in-from-bottom-2 ${bgStyles}`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs font-medium leading-relaxed">{alert.message}</div>
      <button
        onClick={() => onDismiss(alert.id)}
        className="text-white/60 hover:text-white p-0.5 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
