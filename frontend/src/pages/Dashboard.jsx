import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, authState } from '../api/client';
import { Card, Badge, ChequeChip, Button, SkeletonCard, Skeleton } from '../components/ui';
import { ErrorCard } from '../components/ErrorCard';
import { Users, Heart, Calendar, Bell, Edit3, Image, Video, MoreHorizontal, MessageCircle, Share2, ThumbsUp, Facebook, Twitter, Mail, Phone, MessageSquare, Send, ArrowRight } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { Avatar } from '../components/Avatar';

export function Dashboard() {
  const user = authState.getUser();
  const navigate = useNavigate();
  const { activeScope } = useTenant();
  const [data, setData] = useState({ stats: {}, recentPosts: [], upcomingEvents: [] });
  const [socialSettings, setSocialSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.getDashboard(activeScope),
      api.getGroupSettings(activeScope)
    ])
      .then(([dashboardRes, settingsRes]) => {
         setData(dashboardRes);
         setSocialSettings(settingsRes || {});
      })
      .catch(err => {
         console.error("Dashboard error", err);
         setError(err.message || "Failed to load dashboard");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [activeScope]);

  if (error) return <ErrorCard message={error} onRetry={loadData} context="Dashboard" />;

  if (loading) return (
    <div className="flex flex-col gap-4 pt-2 animate-fade-in">
       {/* Skeleton stats */}
       <div className="flex gap-3">
         <div className="flex-1 skeleton h-24 rounded-2xl" />
         <div className="flex-1 skeleton h-24 rounded-2xl" />
         <div className="flex-1 skeleton h-24 rounded-2xl" />
       </div>
       {/* Skeleton composer */}
       <div className="skeleton h-28 rounded-2xl" />
       {/* Skeleton feed */}
       <SkeletonCard />
       <SkeletonCard />
    </div>
  );

  const scopeType = activeScope?.type;
  const isUnsupportedScope = scopeType === 'club' || scopeType === 'house' ||
    (scopeType === 'all' && (!data?.stats?.ygMembersCount && !data?.recentPosts?.length));

  if (isUnsupportedScope) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center animate-fade-in">
        <div className="p-5 bg-surface-muted rounded-2xl">
          <Users size={36} className="text-ink-muted" />
        </div>
        <h3 className="text-[18px] font-bold text-ink-title">
          {scopeType === 'club' ? 'Club Scope' : scopeType === 'house' ? 'House Scope' : 'Platform Scope'}
        </h3>
        <p className="text-[14px] text-ink-muted max-w-[320px] leading-relaxed">
          {scopeType === 'club'
            ? 'Club-scoped data is available in Phase 2. Switch to Year Group or School to see content.'
            : scopeType === 'house'
            ? 'House-scoped data is available in Phase 2. Switch to Year Group or School to see content.'
            : 'Platform-wide aggregate data is only visible from the Cockpit overview.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-12 overflow-x-hidden stagger-children">
      
      {/* Pending Action Alert */}
      {user && user.role && user.role.includes("Admin") && data?.stats?.pendingPostsCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 flex items-center justify-between border border-amber-200 dark:border-amber-800 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-white dark:bg-amber-900/20 shadow-sm">
                <Bell className="text-amber-500" size={20} />
             </div>
             <span className="text-ink-title font-medium text-[14px]">
               You have pending newsletter posts awaiting review.
             </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/app/newsletter')} className="!shadow-none">
            Review
            <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x">
         <StatCard icon={Users} value={data?.stats?.ygMembersCount || '-'} label="Members" color="var(--school-primary)" bgColor="var(--school-tint)" navigateTo="/app/members" />
         <StatCard icon={Heart} value={data?.stats?.activeCampaignsCount || '-'} label="Campaigns" color="#EF4444" bgColor="#FEF2F2" darkBg="#7F1D1D20" navigateTo="/app/fundraising" />
         <StatCard icon={Calendar} value={data?.stats?.upcomingEventsCount || '-'} label="Events" color="#3B82F6" bgColor="#EFF6FF" darkBg="#1E3A8A20" navigateTo="/app/events" />
      </div>

      {/* Composer */}
      <Card className="!p-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 ease-spring" onClick={() => navigate('/app/board')}>
         <div className="flex gap-3 px-1 pt-1 pb-3">
            <Avatar src={user.profile_pic} name={user.name} size="md" />
            <button className="flex-1 bg-surface-muted hover:bg-surface-hover transition-colors rounded-xl px-4 text-left text-ink-muted text-[14px] font-medium min-h-[42px] flex items-center">
               What's on your mind, {user.name.split(' ')[0]}?
            </button>
         </div>
         
         <div className="border-t border-border-light pt-2 px-1 flex justify-between gap-1">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full hover:bg-surface-hover active:scale-95 transition-all duration-300 ease-spring text-ink-body font-semibold text-[13px]">
               <Video className="text-red-500" size={18} strokeWidth={2.5}/>
               Live Video
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-full hover:bg-surface-hover active:scale-95 transition-all duration-300 ease-spring text-ink-body font-semibold text-[13px]">
               <Image className="text-emerald-500" size={18} strokeWidth={2.5}/>
               Photo
            </button>
            <button className="flex-1 flex justify-center items-center gap-2 py-2 rounded-full hover:bg-surface-hover active:scale-95 transition-all duration-300 ease-spring text-ink-body font-semibold text-[13px]">
               <Edit3 className="text-amber-500" size={18} strokeWidth={2.5}/>
               Write
            </button>
         </div>
      </Card>

      {/* Social Links */}
      {socialSettings && Object.values(socialSettings).some(val => val && val.trim() !== '') && (
         <div className="flex flex-wrap gap-2">
            {socialSettings.facebookPage && (
               <a href={socialSettings.facebookPage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2]/10 text-[#1877F2] rounded-xl text-[12px] font-semibold hover:bg-[#1877F2]/20 transition-colors">
                  <Facebook size={14} /> Page
               </a>
            )}
            {socialSettings.facebookGroup && (
               <a href={socialSettings.facebookGroup} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2]/10 text-[#1877F2] rounded-xl text-[12px] font-semibold hover:bg-[#1877F2]/20 transition-colors">
                  <Users size={14} /> Group
               </a>
            )}
            {socialSettings.whatsapp && (
               <a href={socialSettings.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] rounded-xl text-[12px] font-semibold hover:bg-[#25D366]/20 transition-colors">
                  <MessageSquare size={14} /> WhatsApp
               </a>
            )}
            {socialSettings.telegram && (
               <a href={socialSettings.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0088cc]/10 text-[#0088cc] rounded-xl text-[12px] font-semibold hover:bg-[#0088cc]/20 transition-colors">
                  <Send size={14} /> Telegram
               </a>
            )}
            {socialSettings.twitter && (
               <a href={socialSettings.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 dark:bg-white/10 dark:text-white bg-black/5 text-black rounded-xl text-[12px] font-semibold hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
                  <Twitter size={14} /> X
               </a>
            )}
            {socialSettings.threads && (
               <a href={socialSettings.threads} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 dark:bg-white/10 dark:text-white bg-black/5 text-black rounded-xl text-[12px] font-semibold hover:bg-black/10 dark:hover:bg-white/20 transition-colors">
                  <span className="font-bold text-[14px] leading-none">@</span> Threads
               </a>
            )}
            {socialSettings.email && (
               <a href={`mailto:${socialSettings.email.split(',')[0].trim()}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl text-[12px] font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                  <Mail size={14} /> Contact
               </a>
            )}
            {socialSettings.phone && (
               <a href={`tel:${socialSettings.phone.split(',')[0].replace(/[^\d+]/g, '')}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-school-tint text-school rounded-xl text-[12px] font-semibold hover:opacity-80 transition-all">
                  <Phone size={14} /> Call
               </a>
            )}
         </div>
      )}

      {/* Feed Header */}
      <h2 className="text-[16px] font-bold text-ink-title mt-1 tracking-tight">Recent Highlights</h2>

      {/* Feed */}
      <div className="flex flex-col gap-4">
        {(!data?.recentPosts || data.recentPosts.length === 0) ? (
          <Card className="text-center py-12">
             <div className="flex justify-center mb-3"><div className="p-4 bg-surface-muted rounded-2xl"><Edit3 size={28} className="text-ink-muted"/></div></div>
             <p className="text-ink-body font-medium text-[15px]">No recent posts available.</p>
             <p className="text-ink-muted text-sm mt-1">Be the first to share an update with {activeScope?.label || 'your group'}!</p>
          </Card>
        ) : (
          data.recentPosts.map((post, i) => (
            <Card key={post.id || i} className="!p-0">
              {/* Post Header */}
              <div className="p-4 flex justify-between items-start">
                 <div className="flex gap-3">
                    <Avatar src={post.author_pic} name={post.author_name} size="md" />
                    <div className="flex flex-col">
                       <span className="font-semibold text-[14px] text-ink-title leading-tight hover:underline cursor-pointer">{post.author_name}</span>
                       <div className="flex items-center gap-1.5 text-[12px] text-ink-muted font-medium mt-0.5">
                          <span>{new Date(post.submission_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                          <span>·</span>
                          <span className="uppercase text-[10px] font-semibold tracking-wide bg-surface-muted px-1.5 py-0.5 rounded">{post.category}</span>
                       </div>
                    </div>
                 </div>
                 <button className="text-ink-muted hover:bg-surface-muted p-2 rounded-xl transition-colors"><MoreHorizontal size={18}/></button>
              </div>

              {/* Post Body */}
              <div className="px-4 pb-3">
                 {post.title && <h3 className="text-[15px] font-bold text-ink-title mb-1 leading-snug">{post.title}</h3>}
                 <p className="text-[14px] text-ink-title whitespace-pre-line leading-relaxed">{post.content}</p>
              </div>

              {/* Post Footer */}
              <div className="px-4 py-2.5 border-t border-border-light flex justify-between gap-1">
                 <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full hover:bg-surface-hover hover:text-school active:scale-90 transition-all duration-300 ease-spring text-ink-body font-bold text-[13px]">
                    <ThumbsUp size={18} strokeWidth={2.5}/> Like
                 </button>
                 <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full hover:bg-surface-hover active:scale-90 transition-all duration-300 ease-spring text-ink-body font-bold text-[13px]">
                    <MessageCircle size={18} strokeWidth={2.5}/> Comment
                 </button>
                 <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-full hover:bg-surface-hover active:scale-90 transition-all duration-300 ease-spring text-ink-body font-bold text-[13px]">
                    <Share2 size={18} strokeWidth={2.5}/> Share
                 </button>
              </div>
            </Card>
          ))
        )}
      </div>

    </div>
  );
}

// ── Stat Card ──

function StatCard({ icon: Icon, value, label, color, bgColor, darkBg, navigateTo }) {
  const navigate = useNavigate();
  return (
    <div 
      className="min-w-[130px] flex-1 gradient-border-card stat-card-shimmer social-card hover:scale-[1.03] active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] p-4 flex flex-col items-center justify-center gap-1.5 snap-start cursor-pointer group"
      onClick={() => navigateTo && navigate(navigateTo)}
      role="button"
      tabIndex={0}
    >
       <div className="p-2.5 rounded-2xl mb-0.5 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110" style={{ backgroundColor: bgColor, color }}>
         <Icon size={22} strokeWidth={2.5}/>
       </div>
       <span className="text-xl font-bold text-ink-title leading-none tracking-tight">{value}</span>
       <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">{label}</span>
    </div>
  );
}
