import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[OSA ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/app/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-muted flex items-center justify-center p-6">
          <div className="bg-surface-default rounded-2xl shadow-social-card border border-border-light p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-ink-title mb-2">Something went wrong</h2>
            <p className="text-[14px] text-ink-muted mb-6 leading-relaxed">
              An unexpected error occurred while rendering this page. This has been logged for the ICUNI Labs team.
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center font-bold px-6 py-2.5 rounded-lg bg-brand-500 text-white hover:bg-brand-600 active:scale-95 transition-all duration-200 border-none shadow-sm"
            >
              Return to Dashboard
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-ink-muted cursor-pointer font-semibold">Technical Details</summary>
                <pre className="mt-2 text-xs text-red-500 bg-red-50 p-3 rounded-lg overflow-auto max-h-32 border border-red-200">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
