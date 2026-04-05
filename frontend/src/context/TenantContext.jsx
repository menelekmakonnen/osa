/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authState } from '../api/client';
import { applySchoolTheme, restoreTheme, clearTheme } from '../utils/themeEngine';

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
    activeScope: { 
      type: user?.role === 'ICUNI Staff' ? 'all' : (user?.role?.includes('School Admin') || user?.role === 'Super Admin' ? 'school' : 'yeargroup'), 
      id: user?.year_group_id || null, 
      label: user?.year_group_nickname || 'My Year Group' 
    },
    schoolColors: null, // { primary, secondary } resolved hex values
  });
  const [loading, setLoading] = useState(true);

  // Apply school theme on mount / user change
  useEffect(() => {
    // Try restoring from session first (instant)
    const restored = restoreTheme();

    if (user) {
      // Apply theme from user data
      const themeResult = applySchoolTheme({
        primaryHex: user.school_primary_color || null,
        secondaryHex: user.school_secondary_color || null,
        colourNames: user.school_colours || null,
      });

      setTenant(prev => ({
        ...prev,
        schoolColors: {
          primary: themeResult.primary,
          secondary: themeResult.secondary,
          onPrimary: themeResult.onPrimary,
          onSecondary: themeResult.onSecondary,
        }
      }));
    } else if (!restored) {
      // No user, no stored theme — apply defaults
      applySchoolTheme({});
    }
  }, [user?.school_primary_color, user?.school_secondary_color, user?.school_colours]);

  // Clear theme on auth expiry
  useEffect(() => {
    const handleExpired = () => clearTheme();
    window.addEventListener('osa-auth-expired', handleExpired);
    return () => window.removeEventListener('osa-auth-expired', handleExpired);
  }, []);

  useEffect(() => {
    // Determine Tenant from URL
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    let updates = {};

    const mapped = DOMAIN_MAPPING[hostname];
    if (mapped) {
        updates.schoolId = mapped.schoolId;
        updates.name = mapped.name;
        updates.isCustomDomain = true;
        updates.activeScope = { type: 'school', id: mapped.schoolId, label: 'Whole School' };
    } else {
        const pathParts = pathname.split('/').filter(Boolean);
        if (pathParts[0] === 'app' && pathParts.length > 1) {
            const standardRoutes = ['dashboard', 'newsletter', 'fundraising', 'events', 'members', 'board', 'gallery', 'profile', 'admin', 'superadmin', 'cockpit', 'settings', 'support'];
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

  const setScope = (type, id, label) => {
      setTenant(prev => ({ ...prev, activeScope: { type, id, label } }));
  };

  /**
   * Update school colors dynamically (used by Super Admin color picker)
   */
  const updateSchoolColors = (primaryHex, secondaryHex) => {
    const result = applySchoolTheme({ primaryHex, secondaryHex });
    setTenant(prev => ({
      ...prev,
      schoolColors: {
        primary: result.primary,
        secondary: result.secondary,
        onPrimary: result.onPrimary,
        onSecondary: result.onSecondary,
      }
    }));
  };

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-8 h-8 border-2 border-ink-muted/20 border-l-ink-muted rounded-full animate-spin" />
            <span className="text-ink-muted text-sm font-medium">Initializing...</span>
          </div>
        </div>
      );
  }

  return (
    <TenantContext.Provider value={{ ...tenant, setScope, updateSchoolColors }}>
      {children}
    </TenantContext.Provider>
  );
}
