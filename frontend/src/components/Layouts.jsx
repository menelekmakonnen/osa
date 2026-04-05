import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Mail, Heart, Calendar, Users, Settings, ShieldAlert, LogOut, Menu, X, Sun, Moon, MessageSquare, Image as ImageIcon, HelpCircle, Monitor, MoreHorizontal, ChevronRight } from 'lucide-react';
import { authState } from '../api/client';
import { useTenant } from '../context/TenantContext';
import { Logo } from './Logo';
import { VerificationWall } from '../pages/VerificationWall';

// ══════════════════════════════════════════════════════════════════════
//  Theme Toggle
// ══════════════════════════════════════════════════════════════════════

export function ThemeToggle({ size = 20 }) {
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
  };

  return (
    <button 
      onClick={toggle} 
      className="icon-btn w-9 h-9 !p-0" 
      aria-label="Toggle Dark Mode"
    >
      <div className="relative w-5 h-5">
        <Sun 
          size={size} 
          strokeWidth={2.5} 
          className={`absolute inset-0 transition-all duration-300 ${isDark ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} 
        />
        <Moon 
          size={size} 
          strokeWidth={2.5} 
          className={`absolute inset-0 transition-all duration-300 ${isDark ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`} 
        />
      </div>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  Auth Layout — Supports both centered and split-screen modes
// ══════════════════════════════════════════════════════════════════════

export function AuthLayout() {
  if (authState.isAuthenticated()) {
    return <Navigate to="/app" replace />;
  }

  // Check stored preference for auth layout style (ICUNI staff can toggle this)
  const layoutPref = localStorage.getItem('osa_auth_layout') || 'split'; // 'split' or 'centered'

  if (layoutPref === 'centered') {
    return (
      <div className="min-h-screen bg-surface-muted flex flex-col justify-center py-12 px-4 animate-fade-in">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center mb-6 mt-4">
            <Link to="/" onClick={() => window.location.href='/'} className="inline-block transition-transform hover:scale-105 active:scale-95">
               <Logo wrapperClass="w-14 h-14 mx-auto" className="w-12 h-12" noText />
            </Link>
            <h2 className="mt-4 text-2xl font-bold text-ink-title tracking-tight">OSA Directory</h2>
            <p className="text-ink-muted text-sm mt-1">Your alumni community, connected.</p>
          </div>
          <div className="bg-surface-default py-8 px-6 shadow-lg rounded-2xl border border-border-light">
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  // Split-screen layout (default — modern)
  return (
    <div className="min-h-screen flex animate-fade-in">
      {/* Left decorative panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--school-primary, #0F172A), var(--school-secondary, #1E293B))' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full mix-blend-screen" style={{ background: 'radial-gradient(circle, var(--school-secondary, #3B82F6), transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full mix-blend-screen" style={{ background: 'radial-gradient(circle, var(--school-primary, #6366F1), transparent)' }} />
        </div>
        <div className="relative z-10 text-center px-12">
          <Logo wrapperClass="w-20 h-20 mx-auto mb-6" className="w-16 h-16" noText />
          <h1 className="text-4xl font-bold mb-3 tracking-tight" style={{ color: 'var(--school-on-primary, white)' }}>
            OSA Directory
          </h1>
          <p className="text-lg opacity-80 leading-relaxed max-w-md" style={{ color: 'var(--school-on-primary, white)' }}>
            A permanent digital home for your old students community.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12 bg-surface-muted">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden text-center mb-8">
            <Link to="/" onClick={() => window.location.href='/'} className="inline-block transition-transform hover:scale-105 active:scale-95">
              <Logo wrapperClass="w-14 h-14 mx-auto" className="w-12 h-12" noText />
            </Link>
            <h2 className="mt-3 text-2xl font-bold text-ink-title tracking-tight">OSA Directory</h2>
          </div>
          <div className="bg-surface-default py-8 px-6 sm:px-8 shadow-lg rounded-2xl border border-border-light">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  Nav Item - Sidebar
// ══════════════════════════════════════════════════════════════════════

function NavItem({ to, icon, label, isAdminSection = false, onClick, collapsed = false }) {
  const Icon = icon;
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  
  let activeClass = isActive 
    ? 'bg-school-tint text-ink-title font-semibold' 
    : 'text-ink-body hover:bg-surface-hover';
    
  let iconColor = isActive ? 'var(--school-primary)' : undefined;

  if (isAdminSection && isActive && label === 'Super Admin') {
    activeClass = 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-bold';
    iconColor = undefined;
  }

  return (
    <Link 
      to={to} 
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 py-2.5 rounded-social transition-all duration-300 ease-spring hover:-translate-y-0.5 active:scale-95 group ${activeClass} ${collapsed ? 'justify-center mx-2 px-0' : 'px-3 mx-2'}`}
    >
      <Icon 
        size={22} 
        strokeWidth={isActive ? 2.5 : 2} 
        className="shrink-0 transition-all duration-200 group-hover:scale-105" 
        style={iconColor ? { color: iconColor } : undefined}
      />
      {!collapsed && <span className="text-[14px] truncate">{label}</span>}
      {!collapsed && isActive && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--school-primary)' }} />
      )}
    </Link>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  Bottom Tab Item (Mobile)
// ══════════════════════════════════════════════════════════════════════

function BottomTabItem({ to, icon, label, onClick }) {
  const Icon = icon;
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-1 flex-1 min-w-0 transition-transform duration-300 ease-spring hover:-translate-y-1 active:scale-90 ${isActive ? 'text-ink-title' : 'text-ink-muted'}`}
    >
      <div className="relative p-1.5 rounded-full transition-colors group-hover:bg-surface-hover">
        <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} style={isActive ? { color: 'var(--school-primary)' } : undefined} />
        {isActive && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full" style={{ backgroundColor: 'var(--school-primary)' }} />
        )}
      </div>
      <span className={`text-[10px] truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>
        {label}
      </span>
    </Link>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  App Layout
// ══════════════════════════════════════════════════════════════════════

export function AppLayout() {
  const user = authState.getUser();
  const { name: tenantName, activeScope, setScope, isCustomDomain } = useTenant();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const navTo = useNavigate();

  // Nav preference: 'bottom' (modern IG/Twitter tabs) or 'hamburger' (classic top)
  const [mobileNavStyle, setMobileNavStyle] = useState(() => {
    return localStorage.getItem('osa_mobile_nav') || 'bottom';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem('osa_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    localStorage.setItem('osa_sidebar_collapsed', newVal.toString());
  };

  // Read impersonation logic
  let isImpersonating = false;
  let impersonationName = "None";
  let impSimRole = null;
  try {
     const imp = JSON.parse(window.localStorage.getItem('osa_active_impersonation'));
     if (imp) {
         isImpersonating = true;
         impersonationName = imp.target_school_id;
         impSimRole = imp.simulate_role;
     }
  } catch(e) {}

  if (!authState.isAuthenticated() || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const effectiveRole = impSimRole || user?.role || '';
  const isYGAdmin = effectiveRole && (effectiveRole.includes("Admin") || effectiveRole.includes("President") || effectiveRole === "ICUNI Staff");
  const isSuperAdmin = effectiveRole && (effectiveRole === "Super Admin" || effectiveRole.includes("School Administrator") || effectiveRole === "ICUNI Staff");
  const isICUNIStaff = effectiveRole === "ICUNI Staff";

  const handleLogout = () => {
    authState.clearSession();
    navTo('/login');
  };

  const needsEmailVerify = user.email_verified === false && !isICUNIStaff;
  const needsIdVerify = isSuperAdmin && !isICUNIStaff && user.id_verified !== true && user.id_verified !== "true";

  const hideCockpit = activeScope?.type === 'yeargroup' || activeScope?.type === 'club' || activeScope?.type === 'house' || activeScope?.type === 'school';
  const hideSuperAdmin = activeScope?.type === 'yeargroup' || activeScope?.type === 'club' || activeScope?.type === 'house';

  if (needsEmailVerify || needsIdVerify) {
    return <VerificationWall user={user} isSuperAdmin={isSuperAdmin} />;
  }

  const shortName = (user.old_students_short_name || 'OSA').replace(/\s+[a-f0-9-]{36}$/i, '');
  const useBottomTabs = mobileNavStyle === 'bottom';

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col md:flex-row relative overflow-x-hidden">

      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[60] animate-slide-down">
          <div className="bg-amber-500 text-slate-900 font-semibold text-[12px] uppercase tracking-widest text-center py-1.5 flex items-center justify-center gap-2">
              <ShieldAlert size={14} />
              God Mode: [{impersonationName}]
              <button onClick={() => window.location.href='/app/cockpit'} className="ml-3 underline bg-amber-600/30 px-2 rounded hover:bg-amber-600/50 transition-colors text-[11px]">Configure</button>
          </div>
        </div>
      )}
      
      {/* ═══ MOBILE TOP HEADER ═══ */}
      <div className={`md:hidden sticky z-40 bg-surface-glass backdrop-blur-2xl border-b border-border-light px-4 py-3 flex items-center justify-between shadow-sm transition-all ${isImpersonating ? 'top-[34px]' : 'top-0'}`}>
        <Link to="/" onClick={() => window.location.href='/'} className="flex items-center gap-2.5 group hover:scale-105 active:scale-95 transition-transform duration-300 ease-spring">
           {user.school_logo ? (
             <img src={user.school_logo} className="w-8 h-8 rounded-lg shrink-0 object-contain shadow-sm bg-white" alt="School Logo" />
           ) : (
             <Logo className="w-5 h-5" wrapperClass="w-8 h-8" noText />
           )}
           <h1 className="text-lg font-bold text-ink-title leading-tight tracking-tight">{shortName}</h1>
        </Link>
        <div className="flex items-center gap-2">
           <ThemeToggle size={18} />
           <Link to="/app/profile">
              {user.profile_pic ? (
                 <img src={user.profile_pic} className="w-8 h-8 rounded-full shadow-sm object-cover bg-white ring-2 ring-border-light" alt="Avatar"/>
              ) : (
                 <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ background: `linear-gradient(135deg, var(--school-primary), var(--school-secondary))` }}>
                    {user.name.charAt(0)}
                 </div>
              )}
           </Link>
           {!useBottomTabs && (
             <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="icon-btn w-8 h-8 !p-0">
               {mobileMenuOpen ? <X size={18} strokeWidth={2.5}/> : <Menu size={18} strokeWidth={2.5}/>}
             </button>
           )}
        </div>
      </div>

      {/* ═══ MOBILE HAMBURGER DROPDOWN (when hamburger mode is selected) ═══ */}
      {!useBottomTabs && mobileMenuOpen && (
         <div className="md:hidden fixed inset-0 z-30 modal-backdrop" onClick={() => setMobileMenuOpen(false)}>
            <div className={`absolute ${isImpersonating ? 'top-[94px]' : 'top-[60px]'} left-0 right-0 bg-surface-default shadow-xl border-b border-border-light flex flex-col gap-1 py-3 px-2 max-h-[70vh] overflow-y-auto animate-slide-down custom-scrollbar`} onClick={e => e.stopPropagation()}>
                
                {/* Mobile Scope */}
                <div className="px-3 py-2 mb-2 border-b border-border-light">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-1 block">Viewing Scope</label>
                    <select 
                       className="osa-select !py-2 text-[13px]"
                       value={activeScope?.type || 'school'}
                       onChange={(e) => {
                          const type = e.target.value;
                          let id = user.school;
                          let label = 'Whole School';
                          if (type === 'yeargroup') { id = user.year_group_id; label = user.year_group_nickname || 'My Year Group'; }
                          else if (type === 'house') { id = user.house_name; label = user.house_name || 'My House'; }
                          else if (type === 'all') { id = 'all'; label = 'All Schools'; }
                          else if (type === 'club') { id = 'club'; label = 'My Club'; }
                          setScope(type, id, label);
                          setMobileMenuOpen(false);
                       }}
                    >
                       {user?.role && user.role.includes("Platform") && <option value="all">All Schools</option>}
                       <option value="school">Whole School</option>
                       {user.year_group_id && <option value="yeargroup">{user.year_group_nickname || 'My Year Group'}</option>}
                       {user.class_group_id && <option value="classgroup">{user.class_group_name || 'My Class Group'}</option>}
                       {(user.role?.includes("President") || user.role?.includes("Admin") || user.role?.includes("IT")) && (
                           <option value="exec">Exec/Admin View</option>
                       )}
                       {isSuperAdmin && <option value="superadmin">Super Admin View</option>}
                    </select>
                </div>

                <NavItem to="/app/dashboard" icon={Home} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/newsletter" icon={Mail} label="Newsletter" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/fundraising" icon={Heart} label="Fundraising" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/events" icon={Calendar} label="Events" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/members" icon={Users} label="Directory" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/board" icon={MessageSquare} label="Group Board" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/gallery" icon={ImageIcon} label="Gallery" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/support" icon={HelpCircle} label="Tech Support" onClick={() => setMobileMenuOpen(false)} />
                
                {isYGAdmin && (
                  <div className="mt-2 pt-2 border-t border-border-light px-2">
                     {!hideCockpit && isICUNIStaff && (
                        <NavItem to="/app/cockpit" icon={Monitor} label="Cockpit" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                     )}
                     <NavItem to="/app/admin" icon={Settings} label="Admin Panel" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                     {!hideSuperAdmin && isSuperAdmin && (
                        <NavItem to="/app/superadmin" icon={ShieldAlert} label="Super Admin" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                     )}
                  </div>
                )}
                
                <div className="mt-3 pt-3 border-t border-border-light px-2">
                   <button 
                     onClick={handleLogout}
                     className="flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-ink-body font-semibold hover:bg-surface-hover transition-colors"
                   >
                     <LogOut size={20} strokeWidth={2} className="text-ink-muted" />
                     <span className="text-[14px]">Log Out</span>
                   </button>
                </div>
            </div>
         </div>
      )}

      {/* ═══ MOBILE BOTTOM TAB BAR (when bottom-tabs mode is selected) ═══ */}
      {useBottomTabs && (
        <div className="md:hidden bottom-tab-bar">
          <div className="flex items-stretch">
            <BottomTabItem to="/app/dashboard" icon={Home} label="Home" />
            <BottomTabItem to="/app/newsletter" icon={Mail} label="News" />
            <BottomTabItem to="/app/fundraising" icon={Heart} label="Fund" />
            <BottomTabItem to="/app/events" icon={Calendar} label="Events" />
            <BottomTabItem to="/app/members" icon={Users} label="People" />
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="flex flex-col items-center justify-center gap-0.5 py-1 flex-1 min-w-0 text-ink-muted transition-transform duration-300 ease-spring hover:-translate-y-1 active:scale-90"
            >
              <div className="relative p-1.5 rounded-full transition-colors hover:bg-surface-hover">
                <MoreHorizontal size={22} strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ BOTTOM TAB "MORE" SHEET ═══ */}
      {useBottomTabs && mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 modal-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute bottom-[60px] left-0 right-0 bg-surface-default shadow-xl rounded-t-2xl border border-border-light flex flex-col py-3 px-2 max-h-[60vh] overflow-y-auto animate-slide-up custom-scrollbar" onClick={e => e.stopPropagation()}>
            
            {/* Scope toggle */}
            <div className="px-3 py-2 mb-2 border-b border-border-light">
              <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-1 block">Scope</label>
              <select 
                className="osa-select !py-2 text-[13px]"
                value={activeScope?.type || 'school'}
                onChange={(e) => {
                  const type = e.target.value;
                  let id = user.school, label = 'Whole School';
                  if (type === 'yeargroup') { id = user.year_group_id; label = user.year_group_nickname || 'My Year Group'; }
                  else if (type === 'house') { id = user.house_name; label = user.house_name || 'My House'; }
                  else if (type === 'all') { id = 'all'; label = 'All Schools'; }
                  setScope(type, id, label);
                  setMobileMenuOpen(false);
                }}
              >
                {user?.role && user.role.includes("Platform") && <option value="all">All Schools</option>}
                <option value="school">Whole School</option>
                {user.year_group_id && <option value="yeargroup">{user.year_group_nickname || 'My Year Group'}</option>}
              </select>
            </div>

            <NavItem to="/app/board" icon={MessageSquare} label="Group Board" onClick={() => setMobileMenuOpen(false)} />
            <NavItem to="/app/gallery" icon={ImageIcon} label="Gallery" onClick={() => setMobileMenuOpen(false)} />
            <NavItem to="/app/support" icon={HelpCircle} label="Tech Support" onClick={() => setMobileMenuOpen(false)} />
            <NavItem to="/app/settings" icon={Settings} label="Settings" onClick={() => setMobileMenuOpen(false)} />
            
            {isYGAdmin && (
              <div className="mt-2 pt-2 border-t border-border-light">
                {isICUNIStaff && !hideCockpit && <NavItem to="/app/cockpit" icon={Monitor} label="Cockpit" isAdminSection onClick={() => setMobileMenuOpen(false)} />}
                <NavItem to="/app/admin" icon={Settings} label="Admin Panel" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                {isSuperAdmin && !hideSuperAdmin && <NavItem to="/app/superadmin" icon={ShieldAlert} label="Super Admin" isAdminSection onClick={() => setMobileMenuOpen(false)} />}
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-border-light">
              <button onClick={handleLogout} className="flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-ink-body font-semibold hover:bg-surface-hover transition-colors">
                <LogOut size={20} strokeWidth={2} className="text-ink-muted" />
                <span className="text-[14px]">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 bg-surface-default/80 backdrop-blur-xl z-40 border-r border-border-light transition-all duration-400 ease-spring overflow-visible ${isImpersonating ? 'pt-[34px]' : ''} ${isSidebarCollapsed ? 'w-[72px]' : 'w-[264px]'}`}>
        
        {/* Collapse toggle handle */}
        <button 
           onClick={toggleSidebar}
           className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-surface-glass backdrop-blur-xl border border-border-light rounded-r-social shadow-sm flex items-center justify-center text-ink-muted hover:text-ink-title z-50 group cursor-pointer transition-all duration-300 ease-spring hover:shadow-md hover:scale-110 active:scale-95`}
        >
           <ChevronRight size={14} className={`transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>

        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col custom-scrollbar">
          {/* Brand Header */}
          <div className={`p-4 flex items-center sticky top-0 bg-surface-default/95 backdrop-blur-md z-20 pb-3 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
               <Link to="/" onClick={() => window.location.href='/'} className={`flex items-center group ${isSidebarCollapsed ? '' : 'gap-3'}`}>
                 {user.school_logo ? (
                   <img src={user.school_logo} className="w-9 h-9 rounded-lg shrink-0 object-contain shadow-sm bg-white transition-transform group-hover:scale-105" alt="School Logo" />
                 ) : (
                   <Logo className="w-6 h-6 transition-transform group-hover:scale-110" wrapperClass="w-9 h-9 shrink-0" noText />
                 )}
                 {!isSidebarCollapsed && (
                   <h1 className="text-[17px] font-bold text-ink-title leading-tight truncate tracking-tight">{shortName}</h1>
                 )}
               </Link>
               {!isSidebarCollapsed && <ThemeToggle size={18} />}
          </div>

          {/* User Mini Profile */}
          <div className="px-3 mt-2 mb-3">
             <Link to="/app/profile" title={isSidebarCollapsed ? "Profile" : undefined} className={`flex items-center rounded-xl bg-surface-muted hover:bg-surface-hover border border-border-light transition-all group ${isSidebarCollapsed ? 'justify-center p-2 mx-auto w-10' : 'gap-3 p-3'}`}>
                {user.profile_pic ? (
                   <img src={user.profile_pic} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full shadow-sm shrink-0 object-cover bg-white ring-2 ring-border-light" alt="Avatar"/>
                ) : (
                   <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shadow-sm shrink-0 text-sm" style={{ background: `linear-gradient(135deg, var(--school-primary), var(--school-secondary))` }}>
                      {user.name.charAt(0)}
                   </div>
                )}
                {!isSidebarCollapsed && (
                  <div className="flex flex-col overflow-hidden">
                     <span className="text-[14px] font-semibold text-ink-title group-hover:text-school transition-colors truncate">{user.name}</span>
                     <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-2 h-2 rounded-full shrink-0 ring-1 ring-black/5" style={{ backgroundColor: user.cheque_colour || '#94A3B8' }} />
                        <span className="text-[11px] text-ink-muted font-medium truncate">{user.year_group_nickname || 'Member'}</span>
                     </div>
                  </div>
                )}
             </Link>
          </div>

        {/* Tenant Scope Toggle */}
        <div className={`px-4 mb-3 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-1.5 block">Viewing Scope</label>
            <select 
               className="osa-select !py-2 text-[13px]"
               value={activeScope?.type || 'school'}
               onChange={(e) => {
                  const type = e.target.value;
                  let id = user.school;
                  let label = 'Whole School';
                  if (type === 'yeargroup') { id = user.year_group_id; label = user.year_group_nickname || 'My Year Group'; }
                  else if (type === 'house') { id = user.house_name; label = user.house_name || 'My House'; }
                  else if (type === 'all') { id = 'all'; label = 'All Schools'; }
                  else if (type === 'club') { id = 'club'; label = 'My Club'; }
                  setScope(type, id, label);
               }}
            >
               {user?.role && user.role.includes("Platform") && <option value="all">All Schools</option>}
               <option value="school">Whole School</option>
               {user.year_group_id && <option value="yeargroup">{user.year_group_nickname || 'My Year Group'}</option>}
               {user.class_group_id && <option value="classgroup">{user.class_group_name || 'My Class Group'}</option>}
               {(user.role?.includes("President") || user.role?.includes("Admin") || user.role?.includes("IT")) && (
                   <option value="exec">Exec/Admin View</option>
               )}
               {isSuperAdmin && <option value="superadmin">Super Admin View</option>}
            </select>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 py-1 flex flex-col gap-0.5 mt-1">
          <NavItem collapsed={isSidebarCollapsed} to="/app/dashboard" icon={Home} label="Dashboard" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/newsletter" icon={Mail} label="Newsletter" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/fundraising" icon={Heart} label="Fundraising" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/events" icon={Calendar} label="Events" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/members" icon={Users} label="Directory" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/board" icon={MessageSquare} label="Group Board" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/gallery" icon={ImageIcon} label="Gallery" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/support" icon={HelpCircle} label="Tech Support" />
          
          {isYGAdmin && (
            <div className={`mt-3 pt-3 border-t border-border-light ${isSidebarCollapsed ? 'mx-2' : 'mx-3'}`}>
              {!isSidebarCollapsed && <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Administration</div>}
              {isICUNIStaff && !hideCockpit && (
                <NavItem collapsed={isSidebarCollapsed} to="/app/cockpit" icon={Monitor} label="Cockpit" isAdminSection />
              )}
              <NavItem collapsed={isSidebarCollapsed} to="/app/admin" icon={Settings} label="Admin Panel" isAdminSection />
              {isSuperAdmin && !hideSuperAdmin && (
                 <NavItem collapsed={isSidebarCollapsed} to="/app/superadmin" icon={ShieldAlert} label="Super Admin" isAdminSection />
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-3 mt-auto border-t border-border-light ${isSidebarCollapsed ? 'px-2' : ''}`}>
          <button 
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Log Out" : undefined}
            className={`flex items-center font-medium text-ink-body hover:bg-surface-hover hover:text-ink-title rounded-xl transition-all ${isSidebarCollapsed ? 'justify-center w-full p-2' : 'gap-3 w-full p-2.5'}`}
          >
            <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border-light flex items-center justify-center text-ink-muted shrink-0">
               <LogOut size={16} strokeWidth={2.5}/>
            </div>
            {!isSidebarCollapsed && <span className="text-[13px]">Log Out</span>}
          </button>
          
          {!isSidebarCollapsed && (
             <div className="mt-3 text-[11px] font-medium text-ink-muted px-2 flex justify-between items-center">
                <span>OSA Platform © 2026</span>
                <Link to="/app/settings" className="text-school hover:opacity-80 font-semibold transition-opacity">Settings</Link>
             </div>
          )}
        </div>
      </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className={`flex-1 flex justify-center w-full transition-all duration-300 ease-expo-out ${isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[264px]'}`}>
         <div className={`w-full max-w-[680px] lg:max-w-[740px] xl:max-w-[800px] py-4 md:py-6 px-4 relative ${useBottomTabs ? 'pb-24' : 'pb-20'} md:pb-6`}>
            {isImpersonating && (
               <div className="mb-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center justify-between shadow-sm animate-slide-down">
                  <div className="flex items-center gap-3">
                     <ShieldAlert size={18} className="text-amber-500 shrink-0" />
                     <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-amber-900 dark:text-amber-200 leading-tight">Simulation Active</span>
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">Possessing namespace of <strong>{impersonationName}</strong></span>
                     </div>
                  </div>
                  <Link to="/app/cockpit" className="shrink-0 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/50 text-amber-800 dark:text-amber-200 text-[11px] font-semibold rounded-lg transition-colors border border-amber-200 dark:border-amber-700">
                      End
                  </Link>
               </div>
            )}
            <div className="animate-fade-in">
              <Outlet />
            </div>
         </div>
      </main>
    </div>
  );
}
