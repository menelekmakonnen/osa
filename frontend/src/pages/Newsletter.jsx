import React, { useState, useEffect } from 'react';
import { api, authState } from '../api/client';
import { Card, Button, Input, Textarea, Badge, Modal, Select } from '../components/ui';
import { ErrorCard } from '../components/ErrorCard';
import { toast } from 'react-hot-toast';
import { FileText, Send, CheckCircle, XCircle, Edit3, Clock, BookOpen, Download, ArrowRight, ChevronRight } from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { Avatar } from '../components/Avatar';

export function Newsletter() {
  const user = authState.getUser();
  const { activeScope } = useTenant();
  const isExec = user && user.role && user.role.toLowerCase() !== "member";

  const [activeTab, setActiveTab] = useState('stories'); // stories, my_submissions, approve, dispatch
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Post Submission State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitData, setSubmitData] = useState({ title: '', category: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  // Return Post State
  const [returnPostData, setReturnPostData] = useState(null);
  const [returnNote, setReturnNote] = useState('');

  // Expanded story
  const [expandedPost, setExpandedPost] = useState(null);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPosts({
        scope_type: activeScope?.type || 'yeargroup',
        scope_id: activeScope?.id || user?.year_group_id || ''
      });
      setPosts(data || []);
    } catch (e) {
      console.error('Newsletter load error:', e);
      setError(e.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activeScope]); // Reload on tab or scope switch

  const handleSubmitPost = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.submitPost({
          ...submitData,
          scope_type: activeScope?.type || 'yeargroup',
          scope_id: activeScope?.id || user?.year_group_id || ''
      });
      setIsSubmitModalOpen(false);
      setSubmitData({ title: '', category: '', content: '' });
      loadPosts();
      toast.success("Story submitted for review!");
    } catch(err) {
      toast.error("Error submitting: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (postId) => {
    try {
      await api.approvePost(postId);
      loadPosts();
      toast.success("Story approved!");
    } catch(err){
      toast.error("Error approving: " + err.message);
    }
  };

  const handleReturnPost = async () => {
    try {
      await api.returnPost(returnPostData.id, returnNote);
      setReturnPostData(null);
      setReturnNote('');
      loadPosts();
      toast.success("Story returned to author.");
    } catch(err){
      toast.error("Error returning: " + err.message);
    }
  };

  const handleDispatch = async () => {
    if (!window.confirm("Dispatch this edition to all members? This action cannot be undone.")) return;
    setLoading(true);
    try {
      await api.dispatchNewsletter();
      toast.success("Newsletter dispatched!");
      loadPosts();
    } catch(err) {
      toast.error("Error dispatching: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: '', label: 'Select Category' },
    { value: 'Personal News', label: 'Personal News' },
    { value: 'Professional', label: 'Professional' },
    { value: 'Announcement', label: 'Announcement' },
    { value: 'Initiative', label: 'Initiative' },
    { value: 'Tribute', label: 'Tribute' },
    { value: 'Other', label: 'Other' },
  ];

  // Derived filtered lists
  const feedPosts = posts.filter(p => p.status === "Approved");
  const myPosts = posts.filter(p => p.author_id === user?.id);
  const pendingPosts = posts.filter(p => p.status === "Pending");

  // Separate hero (latest) from grid
  const heroPosts = feedPosts.length > 0 ? [feedPosts[0]] : [];
  const gridPosts = feedPosts.slice(1);

  return (
    <div className="flex flex-col gap-4 pb-12 w-full max-w-[780px] mx-auto animate-fade-in">
      {error && <ErrorCard message={error} onRetry={loadPosts} context="Newsletter" />}
      
      {/* Header */}
      <div className="flex justify-between items-start px-1">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink-title)] m-0 tracking-tight">Newsletter & Stories</h1>
          <p className="text-[13px] text-[var(--ink-muted)] mt-1">Community stories, updates and announcements.</p>
        </div>
        <Button onClick={() => setIsSubmitModalOpen(true)} className="flex items-center gap-2 px-4 shadow-sm hover:shadow-md rounded-xl">
          <Edit3 size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">Write a Story</span>
        </Button>
      </div>

      {/* Segmented Control Tabs */}
      <div className="bg-[var(--surface-default)] p-1 rounded-xl border border-[var(--border-light)] flex overflow-x-auto scrollbar-hide">
        <TabButton active={activeTab === 'stories'} onClick={() => setActiveTab('stories')}>
          <BookOpen size={14} strokeWidth={2} className="hidden sm:block" /> Stories
        </TabButton>
        <TabButton active={activeTab === 'my_submissions'} onClick={() => setActiveTab('my_submissions')}>
          My Posts
        </TabButton>
        {isExec && (
          <TabButton active={activeTab === 'approve'} onClick={() => setActiveTab('approve')}>
            Review
            {pendingPosts.length > 0 && <span className="ml-1.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none">{pendingPosts.length}</span>}
          </TabButton>
        )}
        {isExec && (
           <TabButton active={activeTab === 'dispatch'} onClick={() => setActiveTab('dispatch')}>
              Dispatch
           </TabButton>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col gap-4 animate-pulse mt-2">
           <div className="h-52 bg-[var(--surface-hover)] w-full rounded-2xl"></div>
           <div className="grid grid-cols-2 gap-4">
              <div className="h-40 bg-[var(--surface-hover)] rounded-2xl"></div>
              <div className="h-40 bg-[var(--surface-hover)] rounded-2xl"></div>
           </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* STORIES TAB — Magazine Layout */}
          {activeTab === 'stories' && (
            feedPosts.length === 0 ? <EmptyState msg="No published stories yet. Be the first to share!" /> : (
              <div className="flex flex-col gap-5">
                {/* Hero Story */}
                {heroPosts.map(post => (
                  <HeroCard key={post.id} post={post} onExpand={() => setExpandedPost(post)} />
                ))}
                
                {/* Story Grid */}
                {gridPosts.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gridPosts.map(post => (
                      <StoryCard key={post.id} post={post} onExpand={() => setExpandedPost(post)} />
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* MY SUBMISSIONS TAB */}
          {activeTab === 'my_submissions' && (
             myPosts.length === 0 ? <EmptyState msg="You haven't submitted any stories yet." /> :
             <div className="flex flex-col gap-3">
               {myPosts.map(post => (
                  <Card key={post.id} className="relative !p-0 border border-[var(--border-light)]">
                    <div className="absolute top-4 right-4 z-10">
                       <StatusBadge status={post.status} />
                    </div>
                    <div className="p-4">
                      <h3 className="text-[16px] font-bold text-[var(--ink-title)] mb-1 pr-24 leading-snug">{post.title}</h3>
                      <div className="text-xs text-[var(--ink-muted)] mb-3 flex items-center gap-2 font-medium">
                        <span className="uppercase tracking-wider">{post.category}</span>
                        <span>•</span>
                        <span>{new Date(post.submission_date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[14px] text-[var(--ink-body)] line-clamp-3 leading-relaxed">{post.content}</p>
                      
                      {post.status === "Rejected" && post.rejection_note && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-[13px] text-red-800 dark:text-red-300">
                          <strong className="font-bold">Editor's Note:</strong> {post.rejection_note}
                        </div>
                      )}
                    </div>
                  </Card>
               ))}
             </div>
          )}

          {/* APPROVE TAB (Admins only) */}
          {activeTab === 'approve' && isExec && (
             pendingPosts.length === 0 ? <EmptyState msg="No stories waiting for review." /> :
             <div className="flex flex-col gap-3">
               {pendingPosts.map(post => (
                 <Card key={post.id} className="!p-0 border-l-[4px] border-l-amber-400 border border-[var(--border-light)]">
                   <div className="p-4">
                     <h3 className="text-[16px] font-bold text-[var(--ink-title)] m-0 leading-snug">{post.title}</h3>
                      <div className="text-[12px] text-[var(--ink-muted)] my-2 flex items-center gap-2 font-medium">
                        <span className="uppercase font-bold" style={{ color: 'var(--school-primary)' }}>{post.category}</span>
                        <span>•</span>
                        <span className="text-[var(--ink-body)]">{post.author_name}</span>
                        <span>•</span>
                        <span>{new Date(post.submission_date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[14px] text-[var(--ink-body)] mb-4 leading-relaxed">{post.content}</p>
                      
                      <div className="flex gap-3 mt-4 border-t border-[var(--border-light)] pt-4">
                        <Button size="md" variant="success" onClick={() => handleApprove(post.id)} className="flex-1 flex gap-2 rounded-xl">
                          <CheckCircle size={16} strokeWidth={2.5}/> Approve
                        </Button>
                        <Button size="md" variant="danger" onClick={() => setReturnPostData(post)} className="flex-1 flex gap-2 rounded-xl">
                          <XCircle size={16} strokeWidth={2.5}/> Return
                        </Button>
                      </div>
                    </div>
                 </Card>
               ))}
             </div>
          )}

          {/* DISPATCH TAB (Admins only) */}
          {activeTab === 'dispatch' && isExec && (
             <Card className="text-center py-12 px-6 border border-[var(--border-light)] flex flex-col items-center justify-center rounded-2xl">
                <div className="p-5 rounded-2xl mb-4" style={{ backgroundColor: 'var(--school-tint)' }}>
                   <Send size={36} style={{ color: 'var(--school-primary)' }} />
                </div>
                <h3 className="text-xl font-bold text-[var(--ink-title)] mb-2">Ready to Dispatch?</h3>
                <p className="text-[14px] text-[var(--ink-muted)] mb-1 max-w-sm">
                   {feedPosts.length} approved {feedPosts.length === 1 ? 'story' : 'stories'} will be compiled into an HTML email.
                </p>
                <p className="text-[13px] text-[var(--ink-muted)] mb-6 max-w-sm">
                   All members of your year group will receive it.
                </p>
                <Button size="lg" className="w-full sm:w-auto px-8 rounded-xl" onClick={handleDispatch}>
                   Dispatch Newsletter
                </Button>
                <button className="mt-4 text-[13px] font-medium text-[var(--ink-muted)] flex items-center gap-1.5 hover:text-[var(--ink-title)] transition-colors">
                  <Download size={14} /> Preview as PDF (coming soon)
                </button>
             </Card>
          )}
        </div>
      )}

      {/* Story Reader Modal */}
      <Modal isOpen={!!expandedPost} onClose={() => setExpandedPost(null)} title="" noPadding>
        {expandedPost && <StoryReader post={expandedPost} />}
      </Modal>

      {/* Submit Modal */}
      <Modal isOpen={isSubmitModalOpen} onClose={() => !submitting && setIsSubmitModalOpen(false)} title="Share Your Story">
        <form onSubmit={handleSubmitPost} className="flex flex-col gap-4 mt-2">
           <Input 
             label="Title" 
             maxLength={150} 
             required 
             value={submitData.title}
             onChange={e => setSubmitData({...submitData, title: e.target.value})}
             placeholder="Give your story a compelling title..."
           />
           <Select 
             label="Category" 
             options={categories} 
             required 
             value={submitData.category}
             onChange={e => setSubmitData({...submitData, category: e.target.value})}
           />
           <Textarea 
             label="Story" 
             maxLength={2000} 
             rows={6} 
             required
             placeholder="Share your news, achievements, memories, or updates..."
             value={submitData.content}
             onChange={e => setSubmitData({...submitData, content: e.target.value})}
           />
           <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" type="button" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="rounded-xl">Submit for Review</Button>
           </div>
        </form>
      </Modal>

      {/* Return Note Modal */}
      <Modal isOpen={!!returnPostData} onClose={() => setReturnPostData(null)} title="Return Story to Author">
         <div className="flex flex-col gap-4 mt-2">
            <p className="text-[13px] text-[var(--ink-muted)]">Explain what needs to be revised before approval.</p>
            <Textarea 
              maxLength={500} 
              rows={4} 
              placeholder="e.g. Please clarify the dates and add more context..."
              value={returnNote}
              onChange={e => setReturnNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => setReturnPostData(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleReturnPost} disabled={!returnNote.trim()} className="rounded-xl">Return Story</Button>
            </div>
         </div>
      </Modal>

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  Sub-components
// ══════════════════════════════════════════════════════════════════════

function TabButton({ active, onClick, children }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-lg font-semibold text-[13px] transition-all duration-150 flex items-center justify-center gap-1.5 whitespace-nowrap ${
        active 
          ? 'bg-[var(--surface-hover)] text-[var(--ink-title)] shadow-sm' 
          : 'bg-transparent text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink-body)]'
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  if(status === 'Approved') return <Badge colorHex="#DCFCE7" textHex="#16A34A">{status}</Badge>;
  if(status === 'Rejected') return <Badge colorHex="#FEE2E2" textHex="#DC2626">Returned</Badge>;
  return <Badge colorHex="#FEF3C7" textHex="#B45309">{status}</Badge>;
}

function EmptyState({ msg }) {
  return (
    <Card className="text-center py-12 !p-0 border border-[var(--border-light)] flex flex-col items-center justify-center rounded-2xl">
       <div className="p-4 bg-[var(--surface-hover)] rounded-2xl mb-3"><FileText size={28} className="text-[var(--ink-muted)]"/></div>
       <div className="text-[var(--ink-body)] font-medium text-[14px]">{msg}</div>
    </Card>
  );
}

// ── Hero Card (first/featured story — large, prominent) ──
function HeroCard({ post, onExpand }) {
  const getCategoryColor = (cat) => {
    const colors = { 'Announcement': '#3B82F6', 'Personal News': '#EC4899', 'Professional': '#8B5CF6', 'Initiative': '#10B981', 'Tribute': '#F59E0B', 'Other': '#6B7280' };
    return colors[cat] || '#6B7280';
  };

  return (
    <Card className="!p-0 border border-[var(--border-light)] overflow-hidden cursor-pointer group rounded-2xl" onClick={onExpand}>
      {/* Category stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: getCategoryColor(post.category) }} />
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <span 
            className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" 
            style={{ backgroundColor: getCategoryColor(post.category) + '18', color: getCategoryColor(post.category) }}
          >
            {post.category}
          </span>
          <span className="text-[12px] text-[var(--ink-muted)] font-medium">
            {new Date(post.submission_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--ink-title)] mb-3 leading-tight group-hover:underline decoration-1 underline-offset-4">{post.title}</h2>
        <p className="text-[15px] text-[var(--ink-body)] line-clamp-3 leading-relaxed mb-4">{post.content}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={post.author_name} src={post.author_pic} size="sm" />
            <span className="text-[13px] font-semibold text-[var(--ink-title)]">{post.author_name}</span>
          </div>
          <span className="text-[13px] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: 'var(--school-primary)' }}>
            Read <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Card>
  );
}

// ── Story Card (grid item) ──
function StoryCard({ post, onExpand }) {
  const getCategoryColor = (cat) => {
    const colors = { 'Announcement': '#3B82F6', 'Personal News': '#EC4899', 'Professional': '#8B5CF6', 'Initiative': '#10B981', 'Tribute': '#F59E0B', 'Other': '#6B7280' };
    return colors[cat] || '#6B7280';
  };

  return (
    <Card className="!p-0 border border-[var(--border-light)] cursor-pointer group rounded-2xl flex flex-col" onClick={onExpand}>
      <div className="h-0.5 w-full" style={{ backgroundColor: getCategoryColor(post.category) }} />
      <div className="p-4 flex flex-col flex-1">
        <span 
          className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full self-start mb-2" 
          style={{ backgroundColor: getCategoryColor(post.category) + '18', color: getCategoryColor(post.category) }}
        >
          {post.category}
        </span>
        <h3 className="text-[15px] font-bold text-[var(--ink-title)] mb-2 leading-snug group-hover:underline decoration-1 underline-offset-2 line-clamp-2">
          {post.title}
        </h3>
        <p className="text-[13px] text-[var(--ink-body)] line-clamp-2 leading-relaxed flex-1 mb-3">{post.content}</p>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border-light)]">
          <div className="flex items-center gap-2">
            <Avatar name={post.author_name} src={post.author_pic} size="xs" />
            <span className="text-[12px] font-medium text-[var(--ink-muted)]">{post.author_name}</span>
          </div>
          <span className="text-[11px] text-[var(--ink-muted)]">
            {new Date(post.submission_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ── Full Story Reader (modal content) ──
function StoryReader({ post }) {
  return (
    <div className="flex flex-col w-full bg-[var(--surface-default)]">
      {/* Header */}
      <div className="p-5 sm:p-6 pb-0">
        <span className="text-[10px] font-bold uppercase tracking-widest mb-2 inline-block" style={{ color: 'var(--school-primary)' }}>
          {post.category}
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink-title)] mb-4 leading-tight">{post.title}</h1>
        <div className="flex items-center gap-3 pb-5 border-b border-[var(--border-light)]">
          <Avatar name={post.author_name} src={post.author_pic} size="md" />
          <div>
            <div className="font-semibold text-[14px] text-[var(--ink-title)]">{post.author_name}</div>
            <div className="text-[12px] text-[var(--ink-muted)] flex items-center gap-1.5">
              <Clock size={12} />
              {new Date(post.submission_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>
      {/* Body */}
      <div className="p-5 sm:p-6">
        <p className="text-[15px] text-[var(--ink-title)] whitespace-pre-line leading-[1.8]">{post.content}</p>
      </div>
    </div>
  );
}
