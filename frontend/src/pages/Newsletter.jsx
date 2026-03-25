import React, { useState, useEffect } from 'react';
import { api, authState } from '../api/client';
import { Card, Button, Input, Textarea, Badge } from '../components/ui';
import { toast } from 'react-hot-toast';
import { FileText, Send, CheckCircle, XCircle, Edit3, ThumbsUp, MessageCircle, Share2 } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export function Newsletter() {
  const user = authState.getUser();
  const { activeScope } = useTenant();
  const isExec = user && user.role && user.role.toLowerCase() !== "member";

  const [activeTab, setActiveTab] = useState('feed'); // feed, my_submissions, approve, dispatch
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Post Submission State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitData, setSubmitData] = useState({ title: '', category: '', content: '' });
  const [submitting, setSubmitting] = useState(false);

  // Return Post State
  const [returnPostData, setReturnPostData] = useState(null);
  const [returnNote, setReturnNote] = useState('');

  const loadPosts = async () => {
    setLoading(true);
    try {
      // Unpack scope so the backend receives scope_type + scope_id strings, not an object
      const data = await api.getPosts({
        scope_type: activeScope?.type || 'yeargroup',
        scope_id: activeScope?.id || user?.year_group_id || ''
      });
      setPosts(data || []);
    } catch (e) {
      console.error('Newsletter load error:', e);
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
      toast.success("Post submitted for review!");
    } catch(err) {
      toast.error("Error submitting post: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (postId) => {
    try {
      await api.approvePost(postId);
      loadPosts();
      toast.success("Post approved!");
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
      toast.success("Post returned to author!");
    } catch(err){
      toast.error("Error returning: " + err.message);
    }
  };

  const handleDispatch = async () => {
    if (!window.confirm("Are you sure you want to dispatch this month's newsletter to all members? This action cannot be undone.")) return;
    setLoading(true);
    try {
      await api.dispatchNewsletter();
      toast.success("Newsletter Dispatched Successfully!");
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

  // Derived filtered lists — guard against null user
  const feedPosts = posts.filter(p => p.status === "Approved");
  const myPosts = posts.filter(p => p.author_id === user?.id);
  const pendingPosts = posts.filter(p => p.status === "Pending");

  return (
    <div className="flex flex-col gap-4 pb-12 w-full max-w-[680px] mx-auto">
      
      {/* Header Area */}
      <div className="bg-surface-default p-4 rounded-[var(--radius-social)] shadow-social-card border border-border-light flex justify-between items-center mb-2">
        <div>
          <h1 className="text-xl font-bold text-ink-title m-0">Newsletter</h1>
          <p className="text-[14px] text-ink-muted mt-0.5">Stay connected with your Year Group updates.</p>
        </div>
        <Button onClick={() => setIsSubmitModalOpen(true)} className="flex items-center gap-2 px-4 shadow-sm hover:shadow-md">
          <Edit3 size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Submit Post</span>
        </Button>
      </div>

      {/* Segmented Control Tabs */}
      <div className="bg-surface-default p-1.5 rounded-xl shadow-social-card border border-border-light flex overflow-x-auto scrollbar-hide">
        <TabButton active={activeTab === 'feed'} onClick={() => setActiveTab('feed')}>
          Feed
        </TabButton>
        <TabButton active={activeTab === 'my_submissions'} onClick={() => setActiveTab('my_submissions')}>
          My Posts
        </TabButton>
        {isExec && (
          <TabButton active={activeTab === 'approve'} onClick={() => setActiveTab('approve')}>
            Review Queue
            {pendingPosts.length > 0 && <span className="ml-2 bg-red-100 text-danger px-2 py-0.5 rounded-full text-[11px] font-bold">{pendingPosts.length}</span>}
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
           <div className="h-48 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
           <div className="h-48 bg-[#E4E6EB] w-full rounded-[var(--radius-social)]"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          
          {/* FEED TAB */}
          {activeTab === 'feed' && (
            feedPosts.length === 0 ? <Message msg="No published posts for your year group yet." /> :
            feedPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}

          {/* MY SUBMISSIONS TAB */}
          {activeTab === 'my_submissions' && (
             myPosts.length === 0 ? <Message msg="You haven't submitted any posts yet." /> :
             myPosts.map(post => (
                <Card key={post.id} className="relative !p-0 border border-border-light shadow-social-card">
                  <div className="absolute top-4 right-4 z-10">
                     <StatusBadge status={post.status} />
                  </div>
                  <div className="p-4">
                    <h3 className="text-[17px] font-bold text-ink-title mb-1 pr-24 leading-snug">{post.title}</h3>
                    <div className="text-xs text-ink-muted mb-3 flex items-center gap-2 font-medium">
                      <span className="uppercase tracking-wider">{post.category}</span>
                      <span>•</span>
                      <span>{new Date(post.submission_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[15px] text-ink-title line-clamp-3 leading-relaxed">{post.content}</p>
                    
                    {post.status === "Rejected" && post.rejection_note && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[14px] text-red-800">
                        <strong className="font-bold">Editor's Note:</strong> {post.rejection_note}
                      </div>
                    )}
                  </div>
                </Card>
             ))
          )}

          {/* APPROVE TAB (Admins only) */}
          {activeTab === 'approve' && isExec && (
             pendingPosts.length === 0 ? <Message msg="No posts waiting for review." /> :
             pendingPosts.map(post => (
               <Card key={post.id} className="border-l-[6px] border-l-amber-400 !border-t-border-light !border-r-border-light !border-b-border-light !p-0 shadow-social-card">
                 <div className="p-4">
                   <h3 className="text-[17px] font-bold text-ink-title m-0 leading-snug">{post.title}</h3>
                    <div className="text-[13px] text-ink-muted my-2 flex items-center gap-2 font-medium">
                      <span className="uppercase text-brand-600 font-bold">{post.category}</span>
                      <span>•</span>
                      <span className="text-ink-title">{post.author_name}</span>
                      <span>•</span>
                      <span>{new Date(post.submission_date).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[15px] text-ink-title mb-4 leading-relaxed">{post.content}</p>
                    
                    <div className="flex gap-3 mt-4 border-t border-border-light pt-4">
                      <Button size="md" variant="success" onClick={() => handleApprove(post.id)} className="flex-1 flex gap-2">
                        <CheckCircle size={18} strokeWidth={2.5}/> Approve
                      </Button>
                      <Button size="md" variant="danger" onClick={() => setReturnPostData(post)} className="flex-1 flex gap-2">
                        <XCircle size={18} strokeWidth={2.5}/> Return
                      </Button>
                    </div>
                  </div>
               </Card>
             ))
          )}

          {/* DISPATCH TAB (Admins only) */}
          {activeTab === 'dispatch' && isExec && (
             <Card className="text-center py-10 px-6 border border-border-light flex flex-col items-center justify-center">
                <div className="p-5 bg-brand-50 rounded-full mb-4">
                   <Send size={40} className="text-brand-600"/>
                </div>
                <h3 className="text-xl font-bold text-ink-title mb-2">Ready to Dispatch?</h3>
                <p className="text-[15px] text-ink-muted mb-6 max-w-sm">
                   Dispatching will compile all currently Approved posts into an HTML email and send it to all members of your year group.
                </p>
                <Button size="lg" className="w-full sm:w-auto px-8" onClick={handleDispatch}>
                   Dispatch Monthly Newsletter
                </Button>
             </Card>
          )}
        </div>
      )}

      {/* Submit Modal */}
      <Modal isOpen={isSubmitModalOpen} onClose={() => !submitting && setIsSubmitModalOpen(false)} title="Submit Newsletter Post">
        <form onSubmit={handleSubmitPost} className="flex flex-col gap-4 mt-2">
           <Input 
             label="Post Title" 
             maxLength={150} 
             required 
             value={submitData.title}
             onChange={e => setSubmitData({...submitData, title: e.target.value})}
           />
           <Select 
             label="Category" 
             options={categories} 
             required 
             value={submitData.category}
             onChange={e => setSubmitData({...submitData, category: e.target.value})}
           />
           <Textarea 
             label="Content" 
             maxLength={2000} 
             rows={6} 
             required
             placeholder="Share your news, announcements, or updates here..."
             value={submitData.content}
             onChange={e => setSubmitData({...submitData, content: e.target.value})}
           />
           <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" type="button" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>Submit for Review</Button>
           </div>
        </form>
      </Modal>

      {/* Return Note Modal */}
      <Modal isOpen={!!returnPostData} onClose={() => setReturnPostData(null)} title="Return Post to Author">
         <div className="flex flex-col gap-4 mt-2">
            <p className="text-sm text-muted">Please provide a note explaining what needs to be revised before approval.</p>
            <Textarea 
              maxLength={500} 
              rows={4} 
              placeholder="e.g. Please clarify the dates for the meeting..."
              value={returnNote}
              onChange={e => setReturnNote(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => setReturnPostData(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleReturnPost} disabled={!returnNote.trim()}>Return Post</Button>
            </div>
         </div>
      </Modal>

    </div>
  );
}

// Helpers

function TabButton({ active, onClick, children }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 py-2 px-4 rounded-lg font-bold text-[14px] transition-all duration-200 flex items-center justify-center whitespace-nowrap ${
        active 
          ? 'bg-surface-muted text-ink-title shadow-sm' 
          : 'bg-transparent text-ink-muted hover:bg-surface-hover hover:text-ink-title'
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  if(status === 'Approved') return <Badge colorHex="#DCFCE7" textHex="#16A34A">{status}</Badge>;
  if(status === 'Rejected') return <Badge colorHex="#FEE2E2" textHex="#DC2626">Returned</Badge>;
  return <Badge colorHex="#FEF3C7" textHex="#B45309">{status}</Badge>; // Pending / Amber
}

function Message({ msg }) {
  return (
    <Card className="text-center py-10 !p-0 border border-border-light flex flex-col items-center justify-center">
       <div className="p-4 bg-surface-muted rounded-full mb-3"><FileText size={32} className="text-ink-muted"/></div>
       <div className="text-ink-body font-medium text-[15px]">{msg}</div>
    </Card>
  );
}

function PostCard({ post }) {
  return (
    <Card className="!p-0 border border-border-light shadow-social-card">
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
      </div>

      {/* Post Body */}
      <div className="px-4 pb-4">
         <h3 className="text-[17px] font-bold text-ink-title mb-1.5 leading-snug">{post.title}</h3>
         <p className="text-[15px] text-ink-title whitespace-pre-line leading-relaxed">{post.content}</p>
      </div>

      {/* Post Action Footer (mock interactions) */}
      <div className="px-4 py-2 border-t border-border-light flex justify-between">
         <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-[15px]">
            <ThumbsUp size={20} strokeWidth={2.5}/> Like
         </button>
         <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-[15px]">
            <MessageCircle size={20} strokeWidth={2.5}/> Comment
         </button>
         <button className="flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-[15px]">
            <Share2 size={20} strokeWidth={2.5}/> Share
         </button>
      </div>
    </Card>
  );
}
