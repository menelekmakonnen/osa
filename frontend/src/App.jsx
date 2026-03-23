import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout, AppLayout } from './components/Layouts';
import { TenantProvider } from './context/TenantContext';
import { Toaster } from 'react-hot-toast';

// Pages
import { Login, Register, ForgotPassword } from './pages/Auth';
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

const ProtectedRoute = ({ children }) => {
  const isAuth = !!window.localStorage.getItem('osa_session_token');
  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <TenantProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1E293B', color: '#fff', borderRadius: '12px', padding: '16px', fontSize: '14px', fontWeight: 'bold' } }} />
      <BrowserRouter>
        <Routes>
        
        {/* Public Landing (Redirecting to Login for v1 MVP) */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public Routes (Auth Layout) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

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
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
        
      </Routes>
    </BrowserRouter>
  </TenantProvider>
);
}

export default App;
