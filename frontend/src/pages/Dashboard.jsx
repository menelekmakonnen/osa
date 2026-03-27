import React, { useEffect, useState } from 'react';
import { api, authState } from '../api/client';
import { Card, Badge, ChequeChip, Button } from '../components/ui';
import { Users, Heart, Calendar, Bell, Edit3, Image, Video, MoreHorizontal, MessageCircle, Share2, ThumbsUp, Facebook, Twitter, Mail, Phone, MessageSquare, Send } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export function Dashboard() {
  const user = authState.getUser();
  const { activeScope } = useTenant();
  const [data, setData] = useState({ stats: {}, recentPosts: [], upcomingEvents: [] });
  const [socialSettings, setSocialSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getDashboard(activeScope),
      api.getGroupSettings(activeScope)
    ])
      .then(([dashboardRes, settingsRes]) => {
         setData(dashboardRes);
         setSocialSettings(settingsRes || {});
      })
      .catch(err => console.error("Dashboard error", err))
      .finally(() => setLoading(false));
  }, [activeScope]);

  if (loading) return (
    <div className="flex flex-col gap-4 animate-pulse pt-4">
       <div className="h-32 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
       <div className="h-64 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
    </div>
  );

  // T2 (club) and T3 (house) scopes have no seeded data — show a graceful empty state
  const scopeType = activeScope?.type;
  const isUnsupportedScope = scopeType === 'club' || scopeType === 'house' ||
    (scopeType === 'all' && (!data?.stats?.ygMembersCount && !data?.recentPosts?.length));

  if (isUnsupportedScope) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="p-5 bg-surface-muted rounded-full">
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
    <div className="flex flex-col gap-5 pb-12 overflow-x-hidden">
      
      {/* Pending Action Alert */}
      {user.role.includes("Admin") && data?.stats?.pendingPostsCount > 0 && (
        <div className="bg-amber-50 rounded-[var(--radius-social)] p-4 flex items-center justify-between border border-amber-200">
          <div className="flex items-center gap-3">
             <div className="bg-white p-2 rounded-full shadow-sm">
                <Bell className="text-amber-500" size={20} />
             </div>
             <span className="text-ink-title font-semibold text-[15px]">
               You have pending newsletter posts awaiting review.
             </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.location.href='/app/newsletter'} className="bg-white border-none shadow-sm text-ink-title hover:bg-surface-hover">Review</Button>
        </div>
      )}

      {/* Composer (Create Post mock area) */}
      <Card className="!p-3 border border-border-light shadow-social-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/app/board'}>
         <div className="flex gap-3 px-1 pt-1 pb-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {user.name.charAt(0)}
            </div>
            {/* Input Trigger */}
            <button className="flex-1 bg-surface-muted hover:bg-surface-hover transition-colors rounded-full px-4 text-left text-ink-muted text-[15px] font-medium min-h-[40px] flex items-center shadow-inner">
               What's on your mind, {user.name.split(' ')[0]}?
            </button>
         </div>
         
         <div className="border-t border-border-light pt-2 px-2 flex justify-between">
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-sm">
               <Video className="text-red-500" size={20} strokeWidth={2.5}/>
               Live Video
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-sm">
               <Image className="text-green-500" size={20} strokeWidth={2.5}/>
               Photo/Video
            </button>
            <button className="flex-1 flex justify-center items-center gap-2 py-2 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-sm">
               <Edit3 className="text-yellow-500" size={20} strokeWidth={2.5}/>
               Write Post
            </button>
         </div>
      </Card>

      {/* Quick Stats Horizon (Facebook Stories/Rooms style placement) */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
         <div className="min-w-[140px] flex-1 bg-surface-default border border-border-light p-4 rounded-[var(--radius-social)] shadow-social-card flex flex-col items-center justify-center gap-1 snap-start">
            <div className="p-2.5 bg-brand-50 rounded-full text-brand-600 mb-1"><Users size={24} strokeWidth={2.5}/></div>
            <span className="text-xl font-bold text-ink-title leading-none">{data?.stats?.ygMembersCount || '-'}</span>
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Members</span>
         </div>
         <div className="min-w-[140px] flex-1 bg-surface-default border border-border-light p-4 rounded-[var(--radius-social)] shadow-social-card flex flex-col items-center justify-center gap-1 snap-start">
            <div className="p-2.5 bg-red-50 rounded-full text-red-500 mb-1"><Heart size={24} strokeWidth={2.5}/></div>
            <span className="text-xl font-bold text-ink-title leading-none">{data?.stats?.activeCampaignsCount || '-'}</span>
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Campaigns</span>
         </div>
         <div className="min-w-[140px] flex-1 bg-surface-default border border-border-light p-4 rounded-[var(--radius-social)] shadow-social-card flex flex-col items-center justify-center gap-1 snap-start">
            <div className="p-2.5 bg-blue-50 rounded-full text-blue-500 mb-1"><Calendar size={24} strokeWidth={2.5}/></div>
            <span className="text-xl font-bold text-ink-title leading-none">{data?.stats?.upcomingEventsCount || '-'}</span>
            <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Events</span>
         </div>
      </div>

      {/* Dynamic Social & Contact Links */}
      {socialSettings && Object.values(socialSettings).some(val => val && val.trim() !== '') && (
         <div className="flex flex-wrap gap-2 mb-2 mt-[-4px]">
            {socialSettings.facebookPage && (
               <a href={socialSettings.facebookPage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2]/10 text-[#1877F2] rounded-full text-[13px] font-bold hover:bg-[#1877F2]/20 transition-colors shadow-sm">
                  <Facebook size={14} /> Official Page
               </a>
            )}
            {socialSettings.facebookGroup && (
               <a href={socialSettings.facebookGroup} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1877F2]/10 text-[#1877F2] rounded-full text-[13px] font-bold hover:bg-[#1877F2]/20 transition-colors shadow-sm">
                  <Users size={14} /> Facebook Group
               </a>
            )}
            {socialSettings.whatsapp && (
               <a href={socialSettings.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#25D366] rounded-full text-[13px] font-bold hover:bg-[#25D366]/20 transition-colors shadow-sm">
                  <MessageSquare size={14} /> WhatsApp Group
               </a>
            )}
            {socialSettings.telegram && (
               <a href={socialSettings.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0088cc]/10 text-[#0088cc] rounded-full text-[13px] font-bold hover:bg-[#0088cc]/20 transition-colors shadow-sm">
                  <Send size={14} /> Telegram
               </a>
            )}
            {socialSettings.twitter && (
               <a href={socialSettings.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 dark:bg-white/10 dark:text-white bg-black/5 text-black rounded-full border border-black/10 dark:border-white/10 text-[13px] font-bold hover:bg-black/10 dark:hover:bg-white/20 transition-colors shadow-sm">
                  <Twitter size={14} /> Twitter / X
               </a>
            )}
            {socialSettings.threads && (
               <a href={socialSettings.threads} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 dark:bg-white/10 dark:text-white bg-black/5 text-black rounded-full border border-black/10 dark:border-white/10 text-[13px] font-bold hover:bg-black/10 dark:hover:bg-white/20 transition-colors shadow-sm">
                  <span className="font-bold text-[14px] leading-none">@</span> Threads
               </a>
            )}
            {socialSettings.email && (
               <a href={`mailto:${socialSettings.email.split(',')[0].trim()}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full text-[13px] font-bold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors shadow-sm">
                  <Mail size={14} /> Contact Us
               </a>
            )}
            {socialSettings.phone && (
               <a href={`tel:${socialSettings.phone.split(',')[0].replace(/[^\d+]/g, '')}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full text-[13px] font-bold hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shadow-sm">
                  <Phone size={14} /> Support
               </a>
            )}
         </div>
      )}

      {/* Main Feed Header */}
      <h2 className="text-[17px] font-bold text-ink-title mt-2 mb-[-8px]">Recent Highlights</h2>

      {/* Feed Stream */}
      <div className="flex flex-col gap-4">
        {(!data?.recentPosts || data.recentPosts.length === 0) ? (
          <Card className="text-center py-10">
             <div className="flex justify-center mb-3"><div className="p-4 bg-surface-muted rounded-full"><Edit3 size={32} className="text-ink-muted"/></div></div>
             <p className="text-ink-body font-medium text-[15px]">No recent posts available.</p>
             <p className="text-ink-muted text-sm mt-1">Be the first to share an update with {activeScope?.label || 'your group'}!</p>
          </Card>
        ) : (
          data.recentPosts.map((post, i) => (
            <Card key={post.id || i} className="!p-0 border border-border-light shadow-social-card">
              {/* Post Header */}
              <div className="p-4 flex justify-between items-start">
                 <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg">
                       {post.author_name.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                       <span className="font-bold text-[15px] text-ink-title leading-tight hover:underline cursor-pointer">{post.author_name}</span>
                       <div className="flex items-center gap-1.5 text-xs text-ink-muted font-medium mt-0.5">
                          <span>{new Date(post.submission_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                          <span>•</span>
                          <span className="uppercase">{post.category}</span>
                       </div>
                    </div>
                 </div>
                 <button className="text-ink-muted hover:bg-surface-muted p-2 rounded-full transition-colors"><MoreHorizontal size={20}/></button>
              </div>

              {/* Post Body */}
              <div className="px-4 pb-3">
                 <h3 className="text-[16px] font-bold text-ink-title mb-1 leading-snug">{post.title}</h3>
                 <p className="text-[15px] text-ink-title whitespace-pre-line leading-relaxed">{post.content}</p>
              </div>

              {/* Post Action Footer */}
              <div className="px-4 py-2 border-t border-border-light flex justify-between">
                 <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-[15px]">
                    <ThumbsUp size={20} strokeWidth={2}/> Like
                 </button>
                 <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-[15px]">
                    <MessageCircle size={20} strokeWidth={2}/> Comment
                 </button>
                 <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-[15px]">
                    <Share2 size={20} strokeWidth={2}/> Share
                 </button>
              </div>
            </Card>
          ))
        )}
      </div>

    </div>
  );
}
