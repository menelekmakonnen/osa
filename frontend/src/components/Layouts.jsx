import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, Mail, Heart, Calendar, Users, UserCircle, Settings, ShieldAlert, LogOut, Menu, X, Sun, Moon, MessageSquare, Image as ImageIcon, HelpCircle, Monitor } from 'lucide-react';
import { authState } from '../api/client';
import { useTenant } from '../context/TenantContext';
import { Logo } from './Logo';
import { VerificationWall } from '../pages/VerificationWall';

export function ThemeToggle() {
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
    <button onClick={toggle} className="p-2 rounded-full bg-surface-muted text-ink-title hover:bg-surface-hover transition-colors" aria-label="Toggle Dark Mode">
      {isDark ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
    </button>
  );
}

export function AuthLayout() {
  if (authState.isAuthenticated()) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-6 mt-4">
          <Link to="/" onClick={() => window.location.href='/'} className="inline-block transition-transform hover:scale-105 active:scale-95">
             <Logo wrapperClass="w-16 h-16 mx-auto" className="w-14 h-14" noText />
          </Link>
          <h2 className="mt-4 text-3xl font-extrabold text-ink-title">OSA Directory</h2>
        </div>
        <div className="bg-surface-default py-8 px-4 shadow-social-card rounded-social sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, isAdminSection = false, onClick, collapsed = false }) {
  const Icon = icon;
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  
  let activeClass = isActive 
    ? 'bg-brand-50 text-brand-600 font-semibold' 
    : 'text-ink-body hover:bg-surface-hover';
    
  let iconClass = isActive ? 'text-brand-500' : 'text-ink-muted';

  if (isAdminSection && isActive && label === 'Super Admin') {
    activeClass = 'bg-amber-50 text-amber-600 font-bold';
    iconClass = 'text-amber-500';
  }

  return (
    <Link 
      to={to} 
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 py-2.5 rounded-lg transition-colors duration-200 ${activeClass} ${collapsed ? 'justify-center mx-3 px-0' : 'px-3 mx-2'}`}
    >
      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={`shrink-0 transition-colors duration-200 ${iconClass}`} />
      {!collapsed && <span className="text-[15px] truncate">{label}</span>}
    </Link>
  );
}

export function AppLayout() {
  const user = authState.getUser();
  const { name: tenantName, activeScope, setScope, isCustomDomain } = useTenant();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  if (!authState.isAuthenticated() || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isYGAdmin = user.role && (user.role.includes("Admin") || user.role.includes("President") || user.role === "IT Department");
  const isSuperAdmin = user.role && (user.role === "Super Admin" || user.role.includes("School Administrator") || user.role === "IT Department");

  const handleLogout = () => {
    authState.clearSession();
    window.location.href = '/login';
  };

  const isICUNIStaff = user.role === "IT Department";
  const needsEmailVerify = user.email_verified === false && !isICUNIStaff;
  const needsIdVerify = isSuperAdmin && !isICUNIStaff && user.id_verified !== true && user.id_verified !== "true";

  if (needsEmailVerify || needsIdVerify) {
    return <VerificationWall user={user} isSuperAdmin={isSuperAdmin} />;
  }

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col md:flex-row">
      
      {/* Mobile Top Navigation */}
      <div className="md:hidden sticky top-0 z-40 bg-surface-default border-b border-border-light px-4 py-3 flex items-center justify-between shadow-sm">
        <Link to="/" onClick={() => window.location.href='/'} className="flex items-center gap-2">
           {user.school_logo ? (
             <img src={user.school_logo} className="w-8 h-8 rounded shrink-0 object-contain shadow-sm bg-white" alt="School Logo" />
           ) : (
             <Logo className="w-5 h-5" wrapperClass="w-8 h-8" noText />
           )}
           <div className="flex flex-col">
             <h1 className="text-xl font-bold text-ink-title leading-tight">{(user.old_students_short_name || 'OSA').replace(/\s+[a-f0-9-]{36}$/i, '')}</h1>
           </div>
        </Link>
        <div className="flex items-center gap-3">
           <ThemeToggle />
           <Link to="/app/profile">
              {user.profile_pic ? (
                 <img src={user.profile_pic} className="w-8 h-8 rounded-full shadow-sm object-cover bg-white" alt="Avatar"/>
              ) : (
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold shadow-sm">
                    {user.name.charAt(0)}
                 </div>
              )}
           </Link>
           <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-1 rounded-full bg-surface-muted text-ink-title">
             {mobileMenuOpen ? <X size={20} strokeWidth={2.5}/> : <Menu size={20} strokeWidth={2.5}/>}
           </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
         <div className="md:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div className="absolute top-[61px] left-0 right-0 bg-surface-default shadow-social-card border-b border-border-light flex flex-col gap-1 py-2 px-2 pb-6" onClick={e => e.stopPropagation()}>
                
                {/* Mobile Scope Toggle */}
                <div className="px-2 py-2 mb-2 border-b border-border-light">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-1 block">Viewing Scope</label>
                    <select 
                       className="w-full bg-surface-muted text-ink-title border border-border-light rounded-lg text-sm font-bold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
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
                       {user.role && user.role.includes("Platform") && <option value="all" style={{backgroundColor:'#fff',color:'#050505'}}>All Schools</option>}
                       <option value="school" style={{backgroundColor:'#fff',color:'#050505'}}>Whole School</option>
                       {user.year_group_id && <option value="yeargroup" style={{backgroundColor:'#fff',color:'#050505'}}>{user.year_group_nickname || 'My Year Group'}</option>}
                       {user.class_group_id && <option value="classgroup" style={{backgroundColor:'#fff',color:'#050505'}}>{user.class_group_name || 'My Class Group'}</option>}
                       {(user.role?.includes("President") || user.role?.includes("Admin") || user.role?.includes("IT")) && (
                           <option value="exec" style={{backgroundColor:'#fff',color:'#050505'}}>Exec/Admin view</option>
                       )}
                       {isSuperAdmin && (
                           <option value="superadmin" style={{backgroundColor:'#fff',color:'#050505'}}>Super Admin view</option>
                       )}
                    </select>
                </div>

                <NavItem to="/app/dashboard" icon={Home} label="Dashboard" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/newsletter" icon={Mail} label="Newsletter" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/fundraising" icon={Heart} label="Fundraising" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/events" icon={Calendar} label="Events" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/members" icon={Users} label="Members Directory" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/board" icon={MessageSquare} label="Group Board" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/gallery" icon={ImageIcon} label="Gallery" onClick={() => setMobileMenuOpen(false)} />
                <NavItem to="/app/support" icon={HelpCircle} label="Tech Support" onClick={() => setMobileMenuOpen(false)} />
                
                {isYGAdmin && (
                  <div className="mt-2 pt-2 border-t border-border-light px-2">
                     <NavItem to="/app/admin" icon={Settings} label="Admin Panel" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                     {isSuperAdmin && (
                        <NavItem to="/app/superadmin" icon={ShieldAlert} label="Super Admin" isAdminSection onClick={() => setMobileMenuOpen(false)} />
                     )}
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-border-light px-2">
                   <button 
                     onClick={handleLogout}
                     className="flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-ink-body font-bold hover:bg-surface-hover transition-colors"
                   >
                     <LogOut size={22} strokeWidth={2} className="text-ink-muted" />
                     <span className="text-[15px]">Log Out</span>
                   </button>
                </div>
            </div>
         </div>
      )}

      {/* Left Sidebar (Desktop Fixed) */}
      <aside className={`hidden md:flex flex-col fixed top-0 left-0 bottom-0 bg-surface-default z-10 border-r border-border-light shadow-sm transition-all duration-300 ${isSidebarCollapsed ? 'w-20 overflow-x-hidden overflow-y-auto no-scrollbar' : 'w-[280px] overflow-y-auto custom-scrollbar'}`}>
        
        {/* Toggle Handle */}
        <button 
           onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
           className="absolute -right-[13px] top-1/2 -translate-y-1/2 w-4 h-16 bg-surface-default border border-border-light rounded-r-lg shadow-sm flex items-center justify-center text-ink-muted hover:text-ink-title z-30 group cursor-pointer"
        >
           <div className={`w-[2px] h-6 bg-ink-muted/30 group-hover:bg-brand-400 rounded-full transition-colors ${isSidebarCollapsed ? 'mr-0.5' : 'ml-0.5'}`}></div>
        </button>

        {/* Brand Header */}
        <div className={`p-4 flex items-center sticky top-0 bg-surface-default/95 backdrop-blur-md z-20 pb-2 ${isSidebarCollapsed ? 'justify-center mx-auto' : 'justify-between'}`}>
             <Link to="/" onClick={() => window.location.href='/'} className={`flex items-center group ${isSidebarCollapsed ? '' : 'gap-3'}`}>
               {user.school_logo ? (
                 <img src={user.school_logo} className={`${isSidebarCollapsed ? 'w-10 h-10' : 'w-10 h-10'} rounded shrink-0 object-contain shadow-sm bg-white transition-transform group-hover:scale-105`} alt="School Logo" />
               ) : (
                 <Logo className="w-6 h-6 transition-transform group-hover:scale-110" wrapperClass="w-10 h-10 shrink-0" noText />
               )}
               {!isSidebarCollapsed && (
                 <div className="flex flex-col">
                   <h1 className="text-[22px] font-bold text-ink-title leading-tight">{(user.old_students_short_name || 'OSA').replace(/\s+[a-f0-9-]{36}$/i, '')}</h1>
                 </div>
               )}
             </Link>
             {!isSidebarCollapsed && <ThemeToggle />}
        </div>

        {/* User Mini Profile Target */}
        <div className="px-3 mt-4 mb-2">
           <Link to="/app/profile" title={isSidebarCollapsed ? "Profile" : undefined} className={`flex items-center rounded-[12px] bg-surface-muted hover:bg-surface-hover border border-border-light transition-colors group ${isSidebarCollapsed ? 'justify-center p-2 mx-auto w-10' : 'gap-3 p-3'}`}>
              {user.profile_pic ? (
                 <img src={user.profile_pic} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full shadow-sm shrink-0 object-cover bg-white" alt="Avatar"/>
              ) : (
                 <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                    {user.name.charAt(0)}
                 </div>
              )}
              {!isSidebarCollapsed && (
                <div className="flex flex-col overflow-hidden">
                   <span className="text-[15px] font-bold text-ink-title group-hover:text-brand-600 transition-colors truncate">{user.name}</span>
                   <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: user.cheque_colour || '#8A8D91' }} />
                      <span className="text-[12px] text-ink-muted font-bold tracking-tight truncate">{user.year_group_nickname}</span>
                   </div>
                </div>
              )}
           </Link>
        </div>

        {/* Tenant Scope Toggle */}
        <div className={`px-4 mb-2 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
            <label className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-1 block">Viewing Scope</label>
            <select 
               className="w-full bg-surface-muted text-ink-title border border-border-light rounded-lg text-[13px] font-bold px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-sm transition-colors hover:border-brand-300"
               value={activeScope?.type || 'school'}
               onChange={(e) => {
                  const type = e.target.value;
                  let id = user.school;
                  let label = 'Whole School';
                  
                  if (type === 'yeargroup') {
                      id = user.year_group_id;
                      label = user.year_group_nickname || 'My Year Group';
                  } else if (type === 'house') {
                      id = user.house_name;
                      label = user.house_name || 'My House';
                  } else if (type === 'all') {
                      id = 'all';
                      label = 'All Schools';
                  } else if (type === 'club') {
                      id = 'club';
                      label = 'My Club';
                  }
                  
                  setScope(type, id, label);
               }}
            >
               {user.role && user.role.includes("Platform") && <option value="all" style={{backgroundColor:'#fff',color:'#050505'}}>All Schools</option>}
               <option value="school" style={{backgroundColor:'#fff',color:'#050505'}}>Whole School</option>
               {user.year_group_id && <option value="yeargroup" style={{backgroundColor:'#fff',color:'#050505'}}>{user.year_group_nickname || 'My Year Group'}</option>}
               {user.class_group_id && <option value="classgroup" style={{backgroundColor:'#fff',color:'#050505'}}>{user.class_group_name || 'My Class Group'}</option>}
               {(user.role?.includes("President") || user.role?.includes("Admin") || user.role?.includes("IT")) && (
                   <option value="exec" style={{backgroundColor:'#fff',color:'#050505'}}>Exec/Admin view</option>
               )}
               {isSuperAdmin && (
                   <option value="superadmin" style={{backgroundColor:'#fff',color:'#050505'}}>Super Admin view</option>
               )}
            </select>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 py-2 flex flex-col gap-1 mt-2">
          <NavItem collapsed={isSidebarCollapsed} to="/app/dashboard" icon={Home} label="Dashboard" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/newsletter" icon={Mail} label="Newsletter" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/fundraising" icon={Heart} label="Fundraising" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/events" icon={Calendar} label="Events" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/members" icon={Users} label="Directory" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/board" icon={MessageSquare} label="Group Board" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/gallery" icon={ImageIcon} label="Gallery" />
          <NavItem collapsed={isSidebarCollapsed} to="/app/support" icon={HelpCircle} label="Tech Support" />
          
          {/* Admin Section */}
          {isYGAdmin && (
            <div className={`mt-4 pt-4 border-t border-border-light ${isSidebarCollapsed ? 'mx-2' : 'mx-4'}`}>
              {!isSidebarCollapsed && <div className="px-2 mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-muted">Administration</div>}
              {isICUNIStaff && (
                <NavItem collapsed={isSidebarCollapsed} to="/app/cockpit" icon={Monitor} label="Cockpit" isAdminSection />
              )}
              <NavItem collapsed={isSidebarCollapsed} to="/app/admin" icon={Settings} label="Admin Panel" isAdminSection />
              {isSuperAdmin && (
                 <NavItem collapsed={isSidebarCollapsed} to="/app/superadmin" icon={ShieldAlert} label="Super Admin" isAdminSection />
              )}
            </div>
          )}
        </nav>

        {/* Support Footer */}
        <div className={`p-4 mt-auto border-t border-border-light bg-surface-muted/30 ${isSidebarCollapsed ? 'px-2' : 'p-4'}`}>
          <button 
            onClick={handleLogout}
            title={isSidebarCollapsed ? "Log Out" : undefined}
            className={`flex items-center font-bold text-ink-body hover:bg-surface-hover hover:text-ink-title rounded-[12px] transition-colors ${isSidebarCollapsed ? 'justify-center w-full p-2' : 'gap-3 w-full p-3'}`}
          >
            <div className={`w-9 h-9 rounded-full bg-surface-muted border border-border-light flex items-center justify-center text-ink-title shadow-sm shrink-0`}>
               <LogOut size={18} strokeWidth={2.5}/>
            </div>
            {!isSidebarCollapsed && <span className="text-[14px]">Log Out</span>}
          </button>
          {!isSidebarCollapsed && (
            <div className="mt-4 text-[11px] font-semibold text-ink-muted px-2 flex justify-between items-center">
              <span>OSA Platform © 2026</span>
              <span className="text-brand-500 bg-brand-50 px-2 rounded-full py-0.5">ICUNI</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area - Center Aligned Feed Style */}
      <main className={`flex-1 flex justify-center w-full transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-[280px]'}`}>
         <div className="w-full max-w-[680px] lg:max-w-[740px] xl:max-w-[800px] py-4 md:py-6 px-4 pb-20 md:pb-6">
            <Outlet />
         </div>
      </main>
    </div>
  );
}
