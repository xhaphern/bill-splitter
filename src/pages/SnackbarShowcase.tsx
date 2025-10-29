// Dev-only page for reviewing snackbar designs
// This file is not referenced anywhere in production code

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Receipt, X, SaveIcon } from "../icons";
import confetti from "canvas-confetti";

type SnackbarKind = 'success' | 'warning' | 'error' | 'info';

interface SnackbarVariant {
  kind: SnackbarKind;
  title: string;
  message: string;
  hasAction?: boolean;
  actionLabel?: string;
}

const variants: SnackbarVariant[] = [
  {
    kind: 'success',
    title: 'Bill Saved',
    message: 'Your bill has been saved to history successfully.',
    hasAction: true,
    actionLabel: 'View History'
  },
  {
    kind: 'success',
    title: 'Friend Added',
    message: 'Friend has been added to your list successfully.',
  },
  {
    kind: 'warning',
    title: 'Total Mismatch',
    message: 'Receipt total differs from calculated amount. Please verify.',
    hasAction: true,
    actionLabel: 'Review Items'
  },
  {
    kind: 'warning',
    title: 'Missing Participant',
    message: 'Please add at least one participant to split the bill.',
  },
  {
    kind: 'error',
    title: 'Scan Failed',
    message: "Couldn't read the receipt. Please try scanning again.",
    hasAction: true,
    actionLabel: 'Try Again'
  },
  {
    kind: 'error',
    title: 'Save Failed',
    message: 'Failed to save your bill. Please check your connection.',
  },
  {
    kind: 'info',
    title: 'Exporting Image',
    message: "Generating your bill breakdown as an image...",
    hasAction: true,
    actionLabel: 'Cancel'
  },
  {
    kind: 'info',
    title: 'Sign In Required',
    message: 'Sign in to save bills and sync across your devices.',
  },
];

export default function SnackbarShowcase() {
  const [activeVariant, setActiveVariant] = useState<number | null>(null);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);

  // State for demo modal interactive participants
  const [item1Participants, setItem1Participants] = useState<string[]>([]);
  const [item2Participants, setItem2Participants] = useState<string[]>(['Shaffan', 'Munjih', 'Laish']);
  const [item3Participants, setItem3Participants] = useState<string[]>(['Munjih']);

  // Trigger confetti when snackbar appears
  useEffect(() => {
    if (showSuccessSnackbar) {
      // Confetti effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.8 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
      });
    }
  }, [showSuccessSnackbar]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!showReviewModal) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowReviewModal(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showReviewModal]);

  const toggleParticipant = (itemSetter: React.Dispatch<React.SetStateAction<string[]>>, name: string) => {
    itemSetter(prev =>
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const getParticipantStyle = (name: string, isSelected: boolean) => {
    if (!isSelected) {
      return {
        className: "rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-95 bg-slate-800/80 text-slate-200 border-slate-700/70 hover:bg-slate-700/80"
      };
    }

    // Dedicated colors when selected
    const colors: Record<string, any> = {
      'Shaffan': { backgroundColor: 'rgb(16 185 129 / 0.15)', borderColor: 'rgb(16 185 129 / 0.5)', color: 'rgb(110 231 183)' },
      'Munjih': { backgroundColor: 'rgb(59 130 246 / 0.15)', borderColor: 'rgb(59 130 246 / 0.5)', color: 'rgb(147 197 253)' },
      'Laish': { backgroundColor: 'rgb(168 85 247 / 0.15)', borderColor: 'rgb(168 85 247 / 0.5)', color: 'rgb(196 181 253)' }
    };

    return {
      className: "rounded-full border px-2.5 py-1 text-xs font-medium transition active:scale-95",
      style: colors[name] || {}
    };
  };

  const renderSnackbar = (variant: SnackbarVariant, index: number) => {
    const isActive = activeVariant === index;

    return (
      <div key={index} className="space-y-3">
        <button
          onClick={() => setActiveVariant(isActive ? null : index)}
          className={`w-full rounded-2xl border shadow-xl backdrop-blur-2xl relative overflow-hidden px-4 py-3 text-left transition hover:scale-[1.02]
            ${variant.kind === 'success' ? 'bg-emerald-950/40 border-emerald-500/30' : ''}
            ${variant.kind === 'warning' ? 'bg-amber-950/40 border-amber-500/30' : ''}
            ${variant.kind === 'error' ? 'bg-red-950/40 border-red-500/30' : ''}
            ${variant.kind === 'info' ? 'bg-blue-950/40 border-blue-500/30' : ''}`}
        >
          {/* Glass shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full relative overflow-hidden
              ${variant.kind === 'success' ? 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 text-emerald-300 shadow-lg shadow-emerald-500/20' : ''}
              ${variant.kind === 'warning' ? 'bg-gradient-to-br from-amber-400/30 to-amber-600/30 text-amber-300 shadow-lg shadow-amber-500/20' : ''}
              ${variant.kind === 'error' ? 'bg-gradient-to-br from-red-400/30 to-red-600/30 text-red-300 shadow-lg shadow-red-500/20' : ''}
              ${variant.kind === 'info' ? 'bg-gradient-to-br from-blue-400/30 to-blue-600/30 text-blue-300 shadow-lg shadow-blue-500/20' : ''}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              <div className={`relative z-10
                ${variant.kind === 'success' ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}
                ${variant.kind === 'warning' ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : ''}
                ${variant.kind === 'error' ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : ''}
                ${variant.kind === 'info' ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]' : ''}`}>
                {variant.kind === 'success' && <CheckCircle2 size={18} />}
                {variant.kind === 'warning' && <AlertTriangle size={18} />}
                {variant.kind === 'error' && <XCircle size={18} />}
                {variant.kind === 'info' && <Receipt size={18} />}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white">{variant.title}</div>
              <div className="text-sm text-slate-300">{variant.message}</div>
            </div>
          </div>
        </button>

        {isActive && (
          <div className={`rounded-2xl border shadow-2xl backdrop-blur-2xl relative overflow-hidden animate-[slideIn_0.3s_ease-out]
                         ${variant.kind === 'success' ? 'bg-emerald-950/40 border-emerald-500/30' : ''}
                         ${variant.kind === 'warning' ? 'bg-amber-950/40 border-amber-500/30' : ''}
                         ${variant.kind === 'error' ? 'bg-red-950/40 border-red-500/30' : ''}
                         ${variant.kind === 'info' ? 'bg-blue-950/40 border-blue-500/30' : ''}`}
          >
            {/* Glass shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />

            <div className="flex gap-3 p-4 relative z-10">
              {/* Icon with colored background and glass effect */}
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full relative overflow-hidden
                              ${variant.kind === 'success' ? 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 text-emerald-300 shadow-lg shadow-emerald-500/20' : ''}
                              ${variant.kind === 'warning' ? 'bg-gradient-to-br from-amber-400/30 to-amber-600/30 text-amber-300 shadow-lg shadow-amber-500/20' : ''}
                              ${variant.kind === 'error' ? 'bg-gradient-to-br from-red-400/30 to-red-600/30 text-red-300 shadow-lg shadow-red-500/20' : ''}
                              ${variant.kind === 'info' ? 'bg-gradient-to-br from-blue-400/30 to-blue-600/30 text-blue-300 shadow-lg shadow-blue-500/20' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <div className={`relative z-10
                              ${variant.kind === 'success' ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}
                              ${variant.kind === 'warning' ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : ''}
                              ${variant.kind === 'error' ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : ''}
                              ${variant.kind === 'info' ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]' : ''}`}>
                  {variant.kind === 'success' && <CheckCircle2 size={20} />}
                  {variant.kind === 'warning' && <AlertTriangle size={20} />}
                  {variant.kind === 'error' && <XCircle size={20} />}
                  {variant.kind === 'info' && <Receipt size={20} />}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white">
                    {variant.title}
                  </h4>
                  <button
                    className="text-slate-400 hover:text-white transition"
                    aria-label="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-300">{variant.message}</p>

                {/* Optional action button */}
                {variant.hasAction && (
                  <button className="mt-3 rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700/50">
                    {variant.actionLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05070b] via-[#0b111a] to-[#05070b] px-4 py-8 sm:p-8">
      {/* Success Snackbar - Fixed at bottom */}
      {showSuccessSnackbar && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-full max-w-md px-4 animate-[slideInUp_0.3s_ease-out]">
          <div className="rounded-2xl border shadow-2xl backdrop-blur-2xl relative overflow-hidden bg-emerald-950/40 border-emerald-500/30">
            {/* Glass shine overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />

            <div className="flex gap-3 p-4 relative z-10">
              {/* Icon with colored background and animated checkmark */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full relative overflow-hidden bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 text-emerald-300 shadow-lg shadow-emerald-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <div className="relative z-10">
                  {/* Animated checkmark SVG */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
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
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white">Items Added</h4>
                  <button
                    onClick={() => setShowSuccessSnackbar(false)}
                    className="text-slate-400 hover:text-white transition"
                    aria-label="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-300">All items have been added to your bill successfully.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Snackbar Showcase</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400">
            Dev-only page for reviewing snackbar designs. Click each variant to preview.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
          {variants.map((variant, index) => renderSnackbar(variant, index))}
        </div>

        {/* All Variants Preview */}
        <div className="mt-12 mb-24">
          <h2 className="mb-4 text-lg sm:text-xl font-semibold text-white">All Variants Preview</h2>
          <p className="mb-4 text-xs sm:text-sm text-slate-400">2x2 grid on desktop, scrollable on mobile</p>

          {/* Mobile: Scrollable vertical list */}
          <div className="lg:hidden space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {[variants[0], variants[2], variants[4], variants[6]].map((variant, index) => (
              <div key={`mobile-${index}`}
                style={{ animationDelay: `${index * 0.1}s` }}
                className={`w-full rounded-2xl border shadow-2xl backdrop-blur-2xl relative overflow-hidden animate-[slideInRight_0.4s_ease-out_both]
                ${variant.kind === 'success' ? 'bg-emerald-950/40 border-emerald-500/30' : ''}
                ${variant.kind === 'warning' ? 'bg-amber-950/40 border-amber-500/30' : ''}
                ${variant.kind === 'error' ? 'bg-red-950/40 border-red-500/30' : ''}
                ${variant.kind === 'info' ? 'bg-blue-950/40 border-blue-500/30' : ''}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />

                <div className="flex gap-3 p-4 relative z-10">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full relative overflow-hidden
                    ${variant.kind === 'success' ? 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 text-emerald-300 shadow-lg shadow-emerald-500/20' : ''}
                    ${variant.kind === 'warning' ? 'bg-gradient-to-br from-amber-400/30 to-amber-600/30 text-amber-300 shadow-lg shadow-amber-500/20' : ''}
                    ${variant.kind === 'error' ? 'bg-gradient-to-br from-red-400/30 to-red-600/30 text-red-300 shadow-lg shadow-red-500/20' : ''}
                    ${variant.kind === 'info' ? 'bg-gradient-to-br from-blue-400/30 to-blue-600/30 text-blue-300 shadow-lg shadow-blue-500/20' : ''}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                    <div className={`relative z-10
                      ${variant.kind === 'success' ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}
                      ${variant.kind === 'warning' ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : ''}
                      ${variant.kind === 'error' ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : ''}
                      ${variant.kind === 'info' ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]' : ''}`}>
                      {variant.kind === 'success' && <CheckCircle2 size={20} />}
                      {variant.kind === 'warning' && <AlertTriangle size={20} />}
                      {variant.kind === 'error' && <XCircle size={20} />}
                      {variant.kind === 'info' && <Receipt size={20} />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-white">{variant.title}</h4>
                      <button className="text-slate-400 hover:text-white transition">
                        <X size={16} />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{variant.message}</p>
                    {variant.hasAction && (
                      <button className="mt-3 rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700/50">
                        {variant.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: 2x2 Grid */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {[variants[0], variants[2], variants[4], variants[6]].map((variant, index) => (
              <div key={`desktop-${index}`}
                style={{ animationDelay: `${index * 0.1}s` }}
                className={`rounded-2xl border shadow-2xl backdrop-blur-2xl relative overflow-hidden animate-[slideInUp_0.4s_ease-out_both]
                ${variant.kind === 'success' ? 'bg-emerald-950/40 border-emerald-500/30' : ''}
                ${variant.kind === 'warning' ? 'bg-amber-950/40 border-amber-500/30' : ''}
                ${variant.kind === 'error' ? 'bg-red-950/40 border-red-500/30' : ''}
                ${variant.kind === 'info' ? 'bg-blue-950/40 border-blue-500/30' : ''}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />

                <div className="flex gap-3 p-4 relative z-10">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full relative overflow-hidden
                    ${variant.kind === 'success' ? 'bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 text-emerald-300 shadow-lg shadow-emerald-500/20' : ''}
                    ${variant.kind === 'warning' ? 'bg-gradient-to-br from-amber-400/30 to-amber-600/30 text-amber-300 shadow-lg shadow-amber-500/20' : ''}
                    ${variant.kind === 'error' ? 'bg-gradient-to-br from-red-400/30 to-red-600/30 text-red-300 shadow-lg shadow-red-500/20' : ''}
                    ${variant.kind === 'info' ? 'bg-gradient-to-br from-blue-400/30 to-blue-600/30 text-blue-300 shadow-lg shadow-blue-500/20' : ''}`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                    <div className={`relative z-10
                      ${variant.kind === 'success' ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}
                      ${variant.kind === 'warning' ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : ''}
                      ${variant.kind === 'error' ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : ''}
                      ${variant.kind === 'info' ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]' : ''}`}>
                      {variant.kind === 'success' && <CheckCircle2 size={20} />}
                      {variant.kind === 'warning' && <AlertTriangle size={20} />}
                      {variant.kind === 'error' && <XCircle size={20} />}
                      {variant.kind === 'info' && <Receipt size={20} />}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-white">{variant.title}</h4>
                      <button className="text-slate-400 hover:text-white transition">
                        <X size={16} />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{variant.message}</p>
                    {variant.hasAction && (
                      <button className="mt-3 rounded-lg border border-slate-600/50 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700/50">
                        {variant.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Modal Design */}
        <div className="mt-12 mb-24">
          <h2 className="mb-4 text-lg sm:text-xl font-semibold text-white">OCR Review Modal Redesign</h2>
          <p className="mb-6 text-xs sm:text-sm text-slate-400">Improved UX for reviewing scanned receipt items</p>

          <button
            onClick={() => setShowReviewModal(true)}
            className="btn-apple btn-primary"
          >
            Preview Review Modal
          </button>

          {/* Modal Preview - Centered Popup with Glass Effect */}
          {showReviewModal && (
            <div
              className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
              onClick={() => setShowReviewModal(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div
                className="w-full max-w-3xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700/50 shadow-2xl backdrop-blur-2xl relative overflow-hidden"
                style={{ background: 'linear-gradient(to bottom right, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))' }}
                onClick={(e) => e.stopPropagation()}
              >
              {/* Glass shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/5 pointer-events-none" />

              {/* Header - Glass style like cards */}
              <div className="flex-shrink-0 px-4 sm:px-6 pt-4 pb-3 relative z-10">
                <div className="rounded-xl border border-slate-700/50 backdrop-blur-xl shadow-lg p-3 sm:p-4 relative overflow-hidden" style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />

                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex-1 min-w-0">
                      <h3 id="modal-title" className="text-white text-base sm:text-lg font-semibold">Review scanned items</h3>
                      <p className="text-xs sm:text-sm text-slate-300/80 mt-0.5">Adjust details and pick participants before adding them to the bill.</p>
                    </div>
                    <button
                      onClick={() => setShowReviewModal(false)}
                      className="flex-shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/50 text-slate-300 transition hover:bg-slate-800/50 active:scale-95 backdrop-blur-sm"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 relative z-10">
                {/* Item 1 - Al Ragu - No participants assigned yet */}
                <div className="rounded-xl border border-slate-700/50 backdrop-blur-xl shadow-lg p-3 sm:p-4 space-y-3 relative overflow-hidden" style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                  {/* Glass effect on cards */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />

                  <div className="relative z-10 space-y-3">
                  {/* Item Name */}
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Item name</label>
                    <input
                      defaultValue="Al Ragu"
                      className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
                      placeholder="Enter item name"
                    />
                  </div>

                  {/* Qty and Price */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Qty</label>
                      <input
                        type="number"
                        defaultValue="1"
                        className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Price (ރ.)</label>
                      <input
                        type="number"
                        defaultValue="162.04"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
                      />
                    </div>
                  </div>

                  {/* Participants - Click to toggle multiple participants */}
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Participants</label>
                    <div className="flex flex-wrap gap-2">
                      {/* All start unselected - click to assign. Multiple can be selected for shared items */}
                      {['Shaffan', 'Munjih', 'Laish'].map(name => {
                        const isSelected = item1Participants.includes(name);
                        const styleProps = getParticipantStyle(name, isSelected);
                        return (
                          <button
                            key={name}
                            onClick={() => toggleParticipant(setItem1Participants, name)}
                            {...styleProps}
                          >
                            {name}{name === 'Shaffan' ? ' (You)' : ''}
                          </button>
                        );
                      })}
                      <button
                        className="rounded-full border border-emerald-500/50 bg-emerald-600/20 px-2.5 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-600/30 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Item 2 - Boscaiola - Example showing 3 participants assigned (shared item) */}
                <div className="rounded-xl border border-slate-700/50 backdrop-blur-xl shadow-lg p-3 sm:p-4 relative overflow-hidden" style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />

                  <div className="relative z-10 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Item name</label>
                    <input
                      defaultValue="Boscaiola"
                      className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Qty</label>
                      <input type="number" defaultValue="1" className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Price (ރ.)</label>
                      <input type="number" defaultValue="162.04" step="0.01" className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Participants</label>
                    <div className="flex flex-wrap gap-2">
                      {/* Interactive - starts with all 3 selected (shared item example) */}
                      {['Shaffan', 'Munjih', 'Laish'].map(name => {
                        const isSelected = item2Participants.includes(name);
                        const styleProps = getParticipantStyle(name, isSelected);
                        return (
                          <button
                            key={name}
                            onClick={() => toggleParticipant(setItem2Participants, name)}
                            {...styleProps}
                          >
                            {name}{name === 'Shaffan' ? ' (You)' : ''}
                          </button>
                        );
                      })}
                      <button
                        className="rounded-full border border-emerald-500/50 bg-emerald-600/20 px-2.5 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-600/30 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Item 3 - Chocolate Milkshake - Example showing only 1 participant assigned */}
                <div className="rounded-xl border border-slate-700/50 backdrop-blur-xl shadow-lg p-3 sm:p-4 relative overflow-hidden" style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />

                  <div className="relative z-10 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Item name</label>
                    <input
                      defaultValue="Chocolate Milkshake"
                      className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Qty</label>
                      <input type="number" defaultValue="1" className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Price (ރ.)</label>
                      <input type="number" defaultValue="46.03" step="0.01" className="w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/60" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-wide text-slate-400 font-medium">Participants</label>
                    <div className="flex flex-wrap gap-2">
                      {/* Interactive - starts with only Munjih selected */}
                      {['Shaffan', 'Munjih', 'Laish'].map(name => {
                        const isSelected = item3Participants.includes(name);
                        const styleProps = getParticipantStyle(name, isSelected);
                        return (
                          <button
                            key={name}
                            onClick={() => toggleParticipant(setItem3Participants, name)}
                            {...styleProps}
                          >
                            {name}{name === 'Shaffan' ? ' (You)' : ''}
                          </button>
                        );
                      })}
                      <button
                        className="rounded-full border border-emerald-500/50 bg-emerald-600/20 px-2.5 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-600/30 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Show more items indicator */}
                <div className="text-center py-2">
                  <span className="text-xs text-slate-400/80">+ 5 more items (Mango Milkshake, Coke, Water, Chicken Crispers, Nuts)</span>
                </div>

                {/* Action buttons at bottom of scroll - user sees when they scroll down */}
                <div className="flex gap-3 pt-2 pb-24">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="btn-apple btn-destructive flex-1 sm:flex-initial"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      // Show success snackbar
                      setShowSuccessSnackbar(true);
                      // Auto-hide after 3 seconds and track timeout ID for cleanup
                      successTimeoutRef.current = setTimeout(() => setShowSuccessSnackbar(false), 3000);
                    }}
                    className="btn-apple btn-primary flex-1"
                  >
                    <SaveIcon size={16} /> Add to bill
                  </button>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
