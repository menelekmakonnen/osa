import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authState } from './api/client';

// Layouts
import { AuthLayout, AppLayout } from './components/Layouts';

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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authState.isAuthenticated());

  useEffect(() => {
    setIsAuthenticated(authState.isAuthenticated());

    const handleAuthExpired = () => setIsAuthenticated(false);
    window.addEventListener('osa-auth-expired', handleAuthExpired);
    return () => window.removeEventListener('osa-auth-expired', handleAuthExpired);
  }, []);

  // Sync auth state
  useEffect(() => {
     setIsAuthenticated(authState.isAuthenticated());
  });

  return (
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

        {/* Protected Routes (App Layout) */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="newsletter" element={<Newsletter />} />
          <Route path="fundraising" element={<Fundraising />} />
          <Route path="events" element={<Events />} />
          <Route path="members" element={<Members />} />
          <Route path="board" element={<Board />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="profile" element={<Profile />} />
          
          {/* Admin Routes (Secured internally within components) */}
          <Route path="admin" element={<Admin />} />
          <Route path="superadmin" element={<SuperAdmin />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}

export default App;
