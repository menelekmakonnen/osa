/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authState } from '../api/client';

export const TenantContext = createContext(null);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Temporary hardcoded mapping; ideally fetched from backend / cache
const DOMAIN_MAPPING = {
  "amosa.icuni.org": { schoolId: "amosa", name: "Aggrey Memorial" },
  "ghananational.org": { schoolId: "ghananational", name: "Ghana National College" }
};

export function TenantProvider({ children }) {
  const user = authState.getUser();
  const [tenant, setTenant] = useState({
    schoolId: null,
    name: "OSA Directory",
    isCustomDomain: false,
    activeScope: { type: 'school', id: user?.school || null, label: 'Whole School' } // Tiers: yeargroup, club, house, school, all-schools
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Determine Tenant from URL
    const hostname = window.location.hostname;
    const pathname = window.location.pathname; // e.g. /amosa/dashboard or /dashboard
    
    // We only need to run this on mount, so we construct the updates 
    // without relying on the specific 'tenant' dependency
    let updates = {};

    // 1. Check if it's a known custom domain/subdomain
    const mapped = DOMAIN_MAPPING[hostname];
    if (mapped) {
        updates.schoolId = mapped.schoolId;
        updates.name = mapped.name;
        updates.isCustomDomain = true;
        updates.activeScope = { type: 'school', id: mapped.schoolId, label: 'Whole School' };
    } else {
        // 2. Fallback to path parsing if on global osa.icuni.org
        const pathParts = pathname.split('/').filter(Boolean);
        
        // Very basic parsing for demo: if /app/school_path
        if (pathParts[0] === 'app' && pathParts.length > 1) {
            // Check if parts[1] is a known route. If not, it's likely a school slug.
            const standardRoutes = ['dashboard', 'newsletter', 'fundraising', 'events', 'members', 'board', 'gallery', 'profile', 'admin', 'superadmin'];
            if (!standardRoutes.includes(pathParts[1])) {
                updates.schoolId = pathParts[1];
                updates.name = pathParts[1].toUpperCase(); 
                updates.activeScope = { type: 'school', id: pathParts[1], label: 'Whole School' };
            }
        }
    }

    setTenant(prev => ({ ...prev, ...updates }));
    setLoading(false);
  }, []);

  // Provide utility to change scope
  const setScope = (type, id, label) => {
      setTenant(prev => ({ ...prev, activeScope: { type, id, label } }));
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center text-ink-muted animate-pulse">Initializing Organization...</div>;
  }

  return (
    <TenantContext.Provider value={{ ...tenant, setScope }}>
      {children}
    </TenantContext.Provider>
  );
}
