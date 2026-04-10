import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout, AppLayout } from './components/Layouts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TenantProvider } from './context/TenantContext';
import { Toaster } from 'react-hot-toast';
import { authState } from './api/client';

// Pages
import { Login, Register, ForgotPassword } from './pages/Auth';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Newsletter } from './pages/Newsletter';
import { Fundraising } from './pages/Fundraising';
import { Events } from './pages/Events';
import { Members } from './pages/Members';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { SuperAdmin } from './pages/SuperAdmin';
import { Board } from './pages/Board';
import { Gallery } from './pages/Gallery';
import { Support } from './pages/Support';
import { VerifyEmail } from './pages/VerifyEmail';
import { Cockpit } from './pages/Cockpit';
import { Settings } from './pages/Settings';

const ProtectedRoute = ({ children }) => {
  const isDemo = localStorage.getItem('osa_demo_mode') === 'true';
  const isAuth = authState.isAuthenticated() && authState.isTokenValid();
  if (!isAuth && !isDemo) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Auto-enter demo mode from /demo URL
function DemoEntry() {
  React.useEffect(() => {
    import('./api/demoData').then(({ DEMO_USER, DEMO_TOKEN }) => {
      sessionStorage.removeItem('osa_theme');
      localStorage.setItem('osa_demo_mode', 'true');
      authState.setSession(DEMO_TOKEN, DEMO_USER);
      document.title = 'AMOSA — Aggrey Memorial (Demo)';
      window.location.replace('/app/dashboard');
    });
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎭</div>
        <p style={{ fontSize: '1rem', fontWeight: 600 }}>Entering Demo Mode…</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <TenantProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1E293B', color: '#fff', borderRadius: '12px', padding: '16px', fontSize: '14px', fontWeight: 'bold' } }} />
      <BrowserRouter>
      <ErrorBoundary>
        <Routes>
        
        {/* Public Landing (Redirecting to Login for v1 MVP) */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Routes (Auth Layout) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Direct Demo Entry — auto-enters demo mode */}
        <Route path="/demo" element={<DemoEntry />} />

        {/* Public Verify Route (standalone — no auth layout) */}
        <Route path="/verify" element={<VerifyEmail />} />

        {/* Protected Routes (App Layout) */}
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="newsletter" element={<Newsletter />} />
          <Route path="fundraising" element={<Fundraising />} />
          <Route path="events" element={<Events />} />
          <Route path="members" element={<Members />} />
          <Route path="board" element={<Board />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="profile" element={<Profile />} />
          <Route path="support" element={<Support />} />
          
          {/* Admin Routes (Secured internally within components) */}
          <Route path="admin" element={<Admin />} />
          <Route path="superadmin" element={<SuperAdmin />} />
          <Route path="cockpit" element={<Cockpit />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
        
      </Routes>
    </ErrorBoundary>
    </BrowserRouter>
  </TenantProvider>
);
}

export default App;
