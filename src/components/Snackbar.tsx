import { useEffect } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Receipt, X } from "../icons";
import confetti from "canvas-confetti";

type SnackbarKind = 'success' | 'warning' | 'error' | 'info';

interface SnackbarProps {
  message: string;
  kind: SnackbarKind;
  onClose: () => void;
}

export default function Snackbar({ message, kind, onClose }: SnackbarProps) {
  // Trigger confetti for success notifications
  useEffect(() => {
    if (kind === 'success') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
      });
    }
  }, [kind]);

  const config = {
    success: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/30',
      iconBg: 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/30',
      iconColor: 'text-emerald-300',
      iconShadow: 'shadow-emerald-500/20',
      iconGlow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]',
      Icon: CheckCircle2
    },
    warning: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-500/30',
      iconBg: 'bg-gradient-to-br from-amber-400/30 to-amber-600/30',
      iconColor: 'text-amber-300',
      iconShadow: 'shadow-amber-500/20',
      iconGlow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]',
      Icon: AlertTriangle
    },
    error: {
      bg: 'bg-red-950/40',
      border: 'border-red-500/30',
      iconBg: 'bg-gradient-to-br from-red-400/30 to-red-600/30',
      iconColor: 'text-red-300',
      iconShadow: 'shadow-red-500/20',
      iconGlow: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]',
      Icon: XCircle
    },
    info: {
      bg: 'bg-blue-950/40',
      border: 'border-blue-500/30',
      iconBg: 'bg-gradient-to-br from-blue-400/30 to-blue-600/30',
      iconColor: 'text-blue-300',
      iconShadow: 'shadow-blue-500/20',
      iconGlow: 'drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]',
      Icon: Receipt
    }
  };

  const style = config[kind];

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-full max-w-md px-4 animate-[slideInUp_0.3s_ease-out]">
      <div className={`rounded-2xl border shadow-2xl backdrop-blur-2xl relative overflow-hidden ${style.bg} ${style.border}`}>
        {/* Glass shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />

        <div className="flex gap-3 p-4 relative z-10">
          {/* Icon with glass effect */}
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full relative overflow-hidden ${style.iconBg} ${style.iconColor} shadow-lg ${style.iconShadow}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <div className="relative z-10">
              {kind === 'success' ? (
                // Animated checkmark for success
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={style.iconGlow}>
                  <circle cx="12" cy="12" r="10" opacity="0.3" />
                  <path
                    d="M8 12l3 3l5-5"
                    style={{
                      strokeDasharray: '15',
                      strokeDashoffset: '15',
                      animation: 'drawCheck 0.8s ease-in-out 0.2s forwards'
                    }}
                  />
                </svg>
              ) : (
                <style.Icon size={20} className={style.iconGlow} />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-white leading-relaxed">{message}</p>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition flex-shrink-0"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
