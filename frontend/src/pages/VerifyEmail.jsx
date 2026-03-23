import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiRequest, authState } from '../api/client';
import { Logo } from '../components/Logo';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMsg('Invalid verification link — no token provided.');
      return;
    }

    (async () => {
      try {
        const data = await apiRequest('verifyEmail', { token });
        if (data) {
          // Update the local session if the user is logged in
          const currentUser = authState.getUser();
          if (currentUser && currentUser.email === data.email) {
            authState.setSession(authState.getToken(), { ...currentUser, email_verified: true });
          }
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg('Verification failed. The link may have expired.');
        }
      } catch (e) {
        setStatus('error');
        setErrorMsg(e.message || 'Verification failed. Please try again.');
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col justify-center items-center py-12 px-4">
      <div className="text-center mb-8">
        <Logo className="w-12 h-12 mx-auto mb-4" />
      </div>

      <div className="w-full max-w-md bg-surface-default shadow-social-card rounded-2xl overflow-hidden border border-border-light p-8">
        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 text-center animate-pulse">
            <Loader2 size={48} className="text-brand-500 animate-spin" />
            <h2 className="text-xl font-bold text-ink-title">Verifying your email...</h2>
            <p className="text-ink-body text-sm">Please wait while we confirm your identity.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 size={44} strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-ink-title">Email Verified!</h2>
            <p className="text-ink-body text-sm">Your email has been successfully verified. You now have full access to the platform.</p>
            <button
              onClick={() => {
                if (authState.isAuthenticated()) {
                  navigate('/app/dashboard', { replace: true });
                } else {
                  navigate('/login', { replace: true });
                }
              }}
              className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
            >
              {authState.isAuthenticated() ? 'Go to Dashboard' : 'Log In'}
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <XCircle size={44} strokeWidth={2} />
            </div>
            <h2 className="text-xl font-bold text-ink-title">Verification Failed</h2>
            <p className="text-ink-body text-sm">{errorMsg}</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-4 w-full bg-surface-muted hover:bg-surface-hover text-ink-title font-bold py-3 rounded-xl transition-colors border border-border-light"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
