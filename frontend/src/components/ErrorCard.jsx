import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Send, CheckCircle } from 'lucide-react';
import { api } from '../api/client';

/**
 * Reusable error display component with:
 * - Error message display
 * - "Retry" button
 * - "Report to ICUNI Labs" button that auto-submits a support ticket
 */
export function ErrorCard({ message, onRetry, context }) {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const handleReport = async () => {
    setReporting(true);
    try {
      await api.submitTicket({
        issue_type: "Platform Bug",
        description: `[Auto-Reported Frontend Error]\n\nError: ${message}\nContext: ${context || 'Unknown'}\nPage: ${window.location.pathname}\nTimestamp: ${new Date().toISOString()}\nUserAgent: ${navigator.userAgent}`,
        initial_tier: "ICUNI Labs"
      });
      setReported(true);
    } catch (err) {
      console.error("Failed to submit error report:", err);
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className="bg-surface-default border border-red-200 rounded-[var(--radius-social,12px)] p-6 shadow-social-card">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-red-50 rounded-full shrink-0">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <h3 className="text-[16px] font-bold text-ink-title">Something went wrong</h3>
          <p className="text-[14px] text-ink-body leading-relaxed">
            {message || "An unexpected error occurred. Please try again or report this issue."}
          </p>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-[13px] font-bold hover:bg-brand-600 active:scale-95 transition-all shadow-sm"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            )}

            {reported ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-[13px] font-bold border border-green-200">
                <CheckCircle size={14} />
                Reported to ICUNI Labs
              </span>
            ) : (
              <button
                onClick={handleReport}
                disabled={reporting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 rounded-lg text-[13px] font-bold hover:bg-amber-100 active:scale-95 transition-all border border-amber-200 shadow-sm disabled:opacity-50"
              >
                <Send size={14} />
                {reporting ? 'Reporting...' : 'Report to ICUNI Labs'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
