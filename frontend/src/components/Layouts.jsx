import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Menu, X, Sun, Moon, MoreHorizontal, ChevronRight } from 'lucide-react';
import { IconDashboard, IconNewsletter, IconFundraising, IconEvents, IconDirectory, IconBoard, IconGallery, IconSupport, IconAdmin, IconSuperAdmin, IconLogout, IconCockpit, IconSettings, NavIconWrap, NAV_COLORS, NAV_ANIMATIONS } from './NavIcons';
import { Avatar } from './Avatar';
import { authState } from '../api/client';
import { useTenant } from '../context/TenantContext';
import { Logo } from './Logo';
import { VerificationWall } from '../pages/VerificationWall';
import { getDemoRole, setDemoRole, exitDemoMode, DEMO_ROLES } from '../api/demoData';
import { useScrollShadow } from '../hooks/useScrollShadow';

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeSlides, setActiveSlides] = useState([]);
  const [intervalDuration, setIntervalDuration] = useState(15000);

  useEffect(() => {
    const duration = parseInt(localStorage.getItem('osa_slider_duration') || '15', 10) * 1000;
    setIntervalDuration(duration);

    const customUrls = JSON.parse(localStorage.getItem('osa_custom_slides') || '{}');
    const disabled = JSON.parse(localStorage.getItem('osa_disabled_slides') || '[]');

    const builtSlides = [];
    for (let i = 1; i <= 10; i++) {
       if (!disabled.includes(i)) {
          builtSlides.push(customUrls[i] || `/alumni/${i}.png`);
       }
    }
    // Fallback if they disable everything
    setActiveSlides(builtSlides.length > 0 ? builtSlides : ['/alumni/1.png']);
  }, []);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, intervalDuration);
    return () => clearInterval(timer);
  }, [activeSlides, intervalDuration]);

  if (authState.isAuthenticated()) {
    return <Navigate to="/app" replace />;
  }

  const BackgroundSlider = () => (
    <>
      {activeSlides.map((src, idx) => (
        <div 
          key={`${src}-${idx}`}
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
             backgroundImage: `url('${src}')`, 
             opacity: currentSlide === idx ? 1 : 0,
             transition: "opacity 4s ease-in-out" 
          }}
        />
      ))}
    </>
  );

  const layoutPref = localStorage.getItem('osa_auth_layout') || 'split';

  if (layoutPref === 'centered') {
    return (
      <div className="min-h-screen flex flex-col justify-center py-12 px-4 animate-fade-in relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <BackgroundSlider />
          <div className="absolute inset-0 bg-surface-default/60 backdrop-blur-xl dark:bg-surface-default/80"></div>
        </div>
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="text-center mb-6 mt-4 drop-shadow-md">
            <Link to="/" onClick={() => window.location.href='/'} className="inline-block transition-transform duration-300 ease-spring hover:scale-105 active:scale-95">
               <Logo wrapperClass="w-14 h-14 mx-auto" className="w-12 h-12" noText />
            </Link>
            <h2 className="mt-4 text-3xl font-black tracking-tight" style={{ color: 'var(--school-primary, #9966CC)' }}>
               <span className="osa-letter l-o">O</span>
               <span className="osa-letter l-s">S</span>
               <span className="osa-letter l-a">A</span>
            </h2>
            <p className="text-ink-muted text-sm mt-2 font-medium">Your alumni community, connected.</p>
          </div>
          <div className="bg-surface-glass backdrop-blur-2xl py-8 px-6 shadow-social-dropdown rounded-[32px] border border-border-light/50">
            <Outlet />
          </div>
        </div>
      </div>
    );
  }

  // Split-screen layout (default — modern)
  return (
    <div className="min-h-screen flex animate-fade-in relative overflow-hidden bg-surface-default">
      
      {/* Mobile Background (behind glass) */}
      <div className="lg:hidden absolute inset-0 z-0">
         <BackgroundSlider />
         <div className="absolute inset-0 bg-surface-default/60 backdrop-blur-2xl dark:bg-surface-default/80"></div>
      </div>

      {/* Left decorative panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden items-center justify-center">
        <BackgroundSlider />
        <div className="absolute inset-0 z-10 mix-blend-multiply" style={{ background: 'linear-gradient(135deg, var(--school-primary), var(--school-secondary))', opacity: 0.85 }}></div>
        <div className="absolute inset-0 opacity-20 z-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full mix-blend-screen" style={{ background: 'radial-gradient(circle, var(--school-secondary, #3B82F6), transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full mix-blend-screen" style={{ background: 'radial-gradient(circle, var(--school-primary, #6366F1), transparent)' }} />
        </div>
        <div className="relative z-20 text-center px-12 -mt-[5%]">
          <Logo wrapperClass="w-24 h-24 mx-auto mb-6 drop-shadow-xl" className="w-20 h-20" noText />
          <h1 className="text-[64px] font-black mb-4 tracking-tight drop-shadow-md text-white">
            <span className="osa-letter l-o">O</span>
            <span className="osa-letter l-s">S</span>
            <span className="osa-letter l-a">A</span>
          </h1>
          <p className="text-xl opacity-90 leading-relaxed max-w-md drop-shadow-md text-white">
            A permanent digital home for your old students community.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12 relative z-10 w-full lg:w-[55%] xl:w-[50%]">
        <div className="hidden lg:block absolute inset-0 z-0">
           <BackgroundSlider />
           <div className="absolute inset-0 bg-surface-default/60 backdrop-blur-3xl"></div>
        </div>

        <div className="w-full max-w-md mx-auto relative z-10">
          <div className="lg:hidden text-center mb-8 drop-shadow-md">
            <Link to="/" onClick={() => window.location.href='/'} className="inline-block transition-transform duration-300 ease-spring hover:scale-105 active:scale-95">
              <Logo wrapperClass="w-14 h-14 mx-auto" className="w-12 h-12" noText />
            </Link>
            <h2 className="mt-3 text-4xl font-black tracking-tight" style={{ color: 'var(--school-primary, #9966CC)' }}>
               <span className="osa-letter l-o">O</span>
               <span className="osa-letter l-s">S</span>
               <span className="osa-letter l-a">A</span>
            </h2>
          </div>
          <div className="bg-surface-glass backdrop-blur-2xl py-8 px-6 sm:px-8 shadow-social-dropdown rounded-[32px] border border-border-light/50">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  Nav Item — "Quiet Luxury" Sidebar
//  Monochrome by default, school-primary accent on active.
// ══════════════════════════════════════════════════════════════════════

// Map icon components to their color keys
const ICON_COLOR_MAP = new Map([
  [IconDashboard, 'dashboard'],
  [IconNewsletter, 'newsletter'],
  [IconFundraising, 'fundraising'],
  [IconEvents, 'events'],
  [IconDirectory, 'directory'],
  [IconBoard, 'board'],
  [IconGallery, 'gallery'],
  [IconSupport, 'support'],
  [IconAdmin, 'admin'],
  [IconSuperAdmin, 'superadmin'],
  [IconCockpit, 'cockpit'],
  [IconSettings, 'settings'],
  [IconLogout, 'logout'],
]);

function NavItem({ to, icon: Icon, label, isAdminSection = false, onClick, collapsed = false }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  const colorKey = ICON_COLOR_MAP.get(Icon) || 'dashboard';

  return (
    <Link 
      to={to} 
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`relative flex items-center rounded-2xl transition-all duration-200 group
        ${isActive 
          ? 'bg-[var(--school-tint)] dark:bg-white/[0.06]' 
          : 'hover:bg-[var(--surface-hover)]'}
        ${collapsed ? 'justify-center mx-1 px-1.5 py-2' : 'px-3 py-2.5 mx-2'}
      `}
      style={isActive ? { color: 'var(--school-primary)' } : undefined}
    >
      {/* Active accent bar */}
      {isActive && !collapsed && (
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
          style={{ backgroundColor: 'var(--school-primary)' }}
        />
      )}
      <NavIconWrap colorKey={colorKey} active={isActive} collapsed={collapsed}>
        <Icon 
          size={19} 
          active={isActive}
        />
      </NavIconWrap>
      {!collapsed && (
        <span className={`ml-3 text-[14.5px] truncate leading-5 transition-colors duration-150
          ${isActive 
            ? 'font-semibold' 
            : 'font-medium text-[var(--ink-body)] group-hover:text-[var(--ink-title)]'}
        `}>{label}</span>
      )}
    </Link>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  Bottom Tab Item (Mobile)
// ══════════════════════════════════════════════════════════════════════

function BottomTabItem({ to, icon: Icon, label, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-1 flex-1 min-w-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 active:scale-90 ${isActive ? 'text-ink-title' : 'text-ink-muted dark:text-slate-400'}`}
    >
      <div className="relative p-1.5 rounded-full transition-colors">
        <Icon size={22} active={isActive} style={isActive ? { color: 'var(--school-primary)' } : undefined} />
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
  const scrollShadowRef = useScrollShadow();

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

  // Demo mode detection (before any conditional returns for hooks compliance)
  const isDemo = localStorage.getItem('osa_demo_mode') === 'true';

  // Demo mode: update page title & favicon to match Aggrey Memorial branding
  useEffect(() => {
    if (!isDemo) return;
    document.title = 'AMOSA — Aggrey Memorial (Demo)';

    // Update favicon with school colors (slight delay for theme engine to apply)
    const timer = setTimeout(() => {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--school-primary').trim() || '#B067A1';
      const secondary = getComputedStyle(document.documentElement).getPropertyValue('--school-secondary').trim() || '#F5C518';
      const svgStr = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 C100 190, 185 150, 185 100 L185 30 Z" fill="${secondary}" fill-opacity="0.9" />
        <path d="M100 10 L15 30 L15 100 C15 150, 100 190, 100 190 L100 10 Z" fill="${primary}" />
        <path d="M100 10 L185 30 L185 100 C185 150, 100 190, 100 190 L100 10 Z" fill="${secondary}" />
        <circle cx="100" cy="70" r="16" fill="white"/>
        <path d="M70 115 h60 M70 145 h60" stroke="white" stroke-width="10" stroke-linecap="round"/>
      </svg>`;
      try {
        const dataUri = "data:image/svg+xml;base64," + btoa(svgStr);
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = dataUri;
      } catch (e) { /* ignore */ }

      // Also update meta theme-color
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.content = primary;
    }, 200);
    return () => clearTimeout(timer);
  }, [isDemo]);

  // Auth redirect — demo users bypass this
  if (!isDemo && (!authState.isAuthenticated() || !user)) {
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

  if (!isDemo && (needsEmailVerify || needsIdVerify)) {
    return <VerificationWall user={user} isSuperAdmin={isSuperAdmin} />;
  }

  const shortName = (user.old_students_short_name || 'OSA').replace(/\s+[a-f0-9-]{36}$/i, '');
  const useBottomTabs = mobileNavStyle === 'bottom';

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col md:flex-row relative overflow-x-hidden">

      {/* Demo Mode Banner — fixed, offsets handled via sidebar/header/main top */}
      {isDemo && (
        <div className="fixed top-0 left-0 right-0 z-[70]">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-semibold text-[12px] text-center py-2 flex items-center justify-center gap-3 flex-wrap px-4">
              <span className="flex items-center gap-1.5 uppercase tracking-widest text-[11px]">
                🎭 Demo — {user.school_name || 'Aggrey Memorial'}
              </span>
              <span className="text-white/40">|</span>
              <label className="flex items-center gap-1.5 text-[11px]">
                <span className="opacity-70">Viewing as:</span>
                <select
                  defaultValue={getDemoRole()}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setDemoRole(newRole);
                    // Force a full hard navigation (not just reload) to ensure all state resets
                    window.location.href = '/app/dashboard';
                  }}
                  className="bg-white/20 border border-white/30 rounded px-2 py-0.5 text-white text-[11px] font-bold cursor-pointer hover:bg-white/30 transition-colors outline-none"
                >
                  <option value="super_admin" className="text-gray-900">Super Admin</option>
                  <option value="admin" className="text-gray-900">Admin</option>
                  <option value="executive" className="text-gray-900">Executive</option>
                  <option value="member" className="text-gray-900">Member</option>
                </select>
              </label>
              <span className="text-white/60 text-[10px] hidden sm:inline">({user.role})</span>
              <button
                onClick={() => exitDemoMode()}
                className="ml-1 bg-white/20 hover:bg-white/30 px-3 py-0.5 rounded text-[11px] font-bold transition-colors border border-white/30"
              >
                Exit
              </button>
          </div>
        </div>
      )}

      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className={`fixed left-0 right-0 z-[60] animate-slide-down ${isDemo ? 'top-[38px]' : 'top-0'}`}>
          <div className="bg-amber-500 text-slate-900 font-semibold text-[12px] uppercase tracking-widest text-center py-1.5 flex items-center justify-center gap-2">
              <ShieldAlert size={14} />
              God Mode: [{impersonationName}]
              <button onClick={() => window.location.href='/app/cockpit'} className="ml-3 underline bg-amber-600/30 px-2 rounded hover:bg-amber-600/50 transition-colors text-[11px]">Configure</button>
          </div>
        </div>
      )}
      
      {/* ═══ MOBILE TOP HEADER ═══ */}
      <div className={`md:hidden sticky z-40 bg-surface-glass backdrop-blur-2xl border-b border-border-light px-4 py-3 flex items-center justify-between shadow-sm transition-all ${isDemo ? (isImpersonating ? 'top-[72px]' : 'top-[38px]') : (isImpersonating ? 'top-[34px]' : 'top-0')}`}>
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
              <Avatar src={user.profile_pic} name={user.name} size="sm" />
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

                <NavItem to="/app/dashboard" icon={IconDashboard} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/newsletter" icon={IconNewsletter} label="Newsletter" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/fundraising" icon={IconFundraising} label="Fundraising" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/events" icon={IconEvents} label="Events" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/members" icon={IconDirectory} label="Directory" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/board" icon={IconBoard} label="Group Board" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/gallery" icon={IconGallery} label="Gallery" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/support" icon={IconSupport} label="Tech Support" onClick={() => setMobileMenuOpen(false)} />
                
                {isYGAdmin && (
                  <div className="mt-2 pt-2 border-t border-border-light px-2">
                     {!hideCockpit && isICUNIStaff && (
                        <NavItem to="/app/cockpit" icon={IconCockpit} label="Cockpit" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                     )}
                     <NavItem to="/app/admin" icon={IconAdmin} label="Admin Panel" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                     {!hideSuperAdmin && isSuperAdmin && (
                        <NavItem to="/app/superadmin" icon={IconSuperAdmin} label="Super Admin" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                     )}
                  </div>
                )}
                
                <div className="mt-3 pt-3 border-t border-border-light px-2">
                   <button 
                     onClick={handleLogout}
                     className="flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-ink-body font-semibold hover:bg-surface-hover transition-colors"
                   >
                     <IconLogout size={20} className="text-ink-muted" />
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
            <BottomTabItem to="/app/dashboard" icon={IconDashboard} label="Home" />
            <BottomTabItem to="/app/newsletter" icon={IconNewsletter} label="News" />
            <BottomTabItem to="/app/fundraising" icon={IconFundraising} label="Fund" />
            <BottomTabItem to="/app/events" icon={IconEvents} label="Events" />
            <BottomTabItem to="/app/members" icon={IconDirectory} label="People" />
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

            <NavItem to="/app/board" icon={IconBoard} label="Group Board" onClick={() => setMobileMenuOpen(false)} />
            <NavItem to="/app/gallery" icon={IconGallery} label="Gallery" onClick={() => setMobileMenuOpen(false)} />
            <NavItem to="/app/support" icon={IconSupport} label="Tech Support" onClick={() => setMobileMenuOpen(false)} />
            <NavItem to="/app/settings" icon={IconSettings} label="Settings" onClick={() => setMobileMenuOpen(false)} />
            
            {isYGAdmin && (
              <div className="mt-2 pt-2 border-t border-border-light">
                {isICUNIStaff && !hideCockpit && <NavItem to="/app/cockpit" icon={IconCockpit} label="Cockpit" isAdminSection onClick={() => setMobileMenuOpen(false)} />}
                <NavItem to="/app/admin" icon={IconAdmin} label="Admin Panel" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                {isSuperAdmin && !hideSuperAdmin && <NavItem to="/app/superadmin" icon={IconSuperAdmin} label="Super Admin" isAdminSection onClick={() => setMobileMenuOpen(false)} />}
              </div>
            )}

            <div className="mt-2 pt-2 border-t border-border-light">
              <button onClick={handleLogout} className="flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-ink-body font-semibold hover:bg-surface-hover transition-colors">
                <IconLogout size={20} className="text-ink-muted" />
                <span className="text-[14px]">Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DESKTOP SIDEBAR ═══ */}
      <aside className={`hidden md:flex flex-col fixed left-0 bottom-0 bg-[var(--surface-default)] z-40 border-r border-[var(--border-light)] transition-all duration-300 overflow-visible ${isSidebarCollapsed ? 'w-[72px]' : 'w-[264px]'}`} style={{ top: isDemo ? (isImpersonating ? '72px' : '38px') : (isImpersonating ? '34px' : '0') }}>
        
        {/* Collapse toggle handle */}
        <button 
           onClick={toggleSidebar}
           className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[var(--surface-elevated)] border border-[var(--border-light)] rounded-r-xl shadow-sm flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-title)] z-50 cursor-pointer transition-all duration-200 hover:shadow-md"
        >
           <ChevronRight size={14} className={`transition-transform duration-200 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>

        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col custom-scrollbar">
          {/* Brand Header */}
          <div className={`p-4 flex items-center sticky top-0 bg-[var(--surface-default)] z-20 pb-3 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
               <Link to="/" onClick={() => window.location.href='/'} className={`flex items-center group ${isSidebarCollapsed ? '' : 'gap-3'}`}>
                 {user.school_logo ? (
                   <img src={user.school_logo} className="w-9 h-9 rounded-lg shrink-0 object-contain shadow-sm bg-white logo-alive" alt="School Logo" />
                 ) : (
                   <Logo className="w-6 h-6 logo-alive" wrapperClass="w-9 h-9 shrink-0" noText />
                 )}
                 {!isSidebarCollapsed && (
                   <h1 className="text-[17px] font-bold text-[var(--ink-title)] leading-tight truncate tracking-tight">{shortName}</h1>
                 )}
               </Link>
               {!isSidebarCollapsed && <ThemeToggle size={18} />}
          </div>

          {/* User Mini Profile */}
          <div className="px-2 mb-2">
             <Link to="/app/profile" title={isSidebarCollapsed ? "Profile" : undefined} className={`flex items-center rounded-xl hover:bg-[var(--surface-hover)] transition-colors group ${isSidebarCollapsed ? 'justify-center p-2 mx-auto w-10' : 'gap-3 p-2.5'}`}>
                <Avatar src={user.profile_pic} name={user.name} size="md" />
                {!isSidebarCollapsed && (
                  <div className="flex flex-col overflow-hidden">
                     <span className="text-[14.5px] font-semibold text-[var(--ink-title)] truncate leading-5">{user.name}</span>
                     <span className="text-[12px] text-[var(--ink-muted)] font-medium truncate">{user.year_group_nickname || 'Member'}</span>
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
        <nav className="flex-1 py-1 flex flex-col gap-1 mt-1">
          <NavItem collapsed={isSidebarCollapsed} to="/app/dashboard" icon={IconDashboard} label="Dashboard" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/newsletter" icon={IconNewsletter} label="Newsletter" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/fundraising" icon={IconFundraising} label="Fundraising" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/events" icon={IconEvents} label="Events" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/members" icon={IconDirectory} label="Directory" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/board" icon={IconBoard} label="Group Board" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/gallery" icon={IconGallery} label="Gallery" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/support" icon={IconSupport} label="Tech Support" />
          
          {isYGAdmin && (
            <div className={`mt-3 pt-3 border-t border-border-light ${isSidebarCollapsed ? 'mx-2' : 'mx-3'}`}>
              {!isSidebarCollapsed && <div className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-slate-500">Administration</div>}
              {isICUNIStaff && !hideCockpit && (
                <NavItem collapsed={isSidebarCollapsed} to="/app/cockpit" icon={IconCockpit} label="Cockpit" isAdminSection />
              )}
              <NavItem collapsed={isSidebarCollapsed} to="/app/admin" icon={IconAdmin} label="Admin Panel" isAdminSection />
              {isSuperAdmin && !hideSuperAdmin && (
                 <NavItem collapsed={isSidebarCollapsed} to="/app/superadmin" icon={IconSuperAdmin} label="Super Admin" isAdminSection />
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-2 mt-auto border-t border-[var(--border-light)] ${isSidebarCollapsed ? 'px-1' : ''}`}>
          <button 
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Log Out" : undefined}
            className={`flex items-center font-medium text-[var(--ink-body)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors w-full ${isSidebarCollapsed ? 'justify-center p-2' : 'gap-3 p-2'}`}
          >
            <IconLogout size={18} className="text-[var(--ink-muted)]" />
            {!isSidebarCollapsed && <span className="text-[14px]">Log Out</span>}
          </button>
          
          {!isSidebarCollapsed && (
             <div className="mt-2 mb-1 text-[11px] font-medium text-[var(--ink-muted)] px-2 flex justify-between items-center">
                <span>OSA Platform © 2026</span>
                <Link to="/app/settings" className="hover:text-[var(--ink-title)] font-semibold transition-colors" style={{ color: 'var(--school-primary)' }}>Settings</Link>
             </div>
          )}
        </div>
      </div>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className={`flex-1 flex justify-center w-full transition-all duration-300 ease-expo-out ${isSidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[264px]'}`} style={isDemo ? { paddingTop: isImpersonating ? '72px' : '38px' } : (isImpersonating ? { paddingTop: '34px' } : undefined)}>
         <div ref={scrollShadowRef} className={`w-full max-w-[680px] lg:max-w-[740px] xl:max-w-[800px] py-5 md:py-8 px-4 relative ${useBottomTabs ? 'pb-24' : 'pb-20'} md:pb-8`}>
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
