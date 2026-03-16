import React, { useEffect, useState } from 'react';
import { api, authState } from '../api/client';
import { Card, Button } from '../components/ui';
import { Edit3, Image as ImageIcon, Video, MessageCircle, Smile, Send, ThumbsUp } from 'lucide-react';
import Picker from 'emoji-picker-react';

export function Board() {
  const user = authState.getUser();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerText, setComposerText] = useState("");
  const [posting, setPosting] = useState(false);
  
  // State for composing comments
  const [commentingOn, setCommentingOn] = useState(null);
  const [commentText, setCommentText] = useState("");

  // State for emoji picker
  const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);

  const fetchMessages = () => {
    setLoading(true);
    api.getBoardMessages(user.year_group_id)
      .then(res => setMessages(res || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostMessage = async () => {
    if (!composerText.trim()) return;
    setPosting(true);
    try {
       await api.postBoardMessage({
           group_id: user.year_group_id,
           content: composerText.trim()
       });
       setComposerText("");
       fetchMessages();
    } catch(err) {
       console.error("Failed to post message", err);
       alert("Failed to post message: " + err.message);
    } finally {
       setPosting(false);
    }
  };

  const handlePostComment = async (msgId) => {
    if (!commentText.trim()) return;
    try {
        await api.addBoardComment({
            message_id: msgId,
            content: commentText.trim()
        });
        setCommentText("");
        setCommentingOn(null);
        fetchMessages();
    } catch(err) {
        console.error("Failed to post comment", err);
        alert("Failed to post comment: " + err.message);
    }
  };

  const handleReaction = async (msgId, emojiObject) => {
      setActiveEmojiPicker(null);
      try {
          await api.reactBoardMessage({
              message_id: msgId,
              emoji: emojiObject.emoji
          });
          fetchMessages();
      } catch(err) {
          console.error("Failed to react", err);
          alert("Failed to react: " + err.message);
      }
  };

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Composer */}
      <Card className="!p-3 border border-border-light shadow-social-card relative z-10 transition-shadow">
         <div className="flex gap-3 px-1 pt-1 pb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                {user.name.charAt(0)}
            </div>
            <textarea 
               value={composerText}
               onChange={e => setComposerText(e.target.value)}
               placeholder={`Share something with ${user.year_group_nickname !== 'PENDING' ? user.year_group_nickname : 'your year group'}...`}
               className="social-textarea flex-1 min-h-[60px] text-[15px] pt-2"
            />
         </div>
         <div className="border-t border-border-light pt-3 px-2 flex justify-between items-center">
            <div className="flex gap-2">
               <button className="p-2 text-ink-muted hover:bg-surface-hover rounded-full transition-colors"><ImageIcon size={20}/></button>
            </div>
            <Button 
                variant="primary" 
                className="px-6 rounded-full shadow-sm disabled:opacity-50"
                disabled={!composerText.trim() || posting}
                onClick={handlePostMessage}
            >
               {posting ? "Posting..." : "Post"}
            </Button>
         </div>
      </Card>

      <div className="flex flex-col gap-4">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col gap-4 animate-pulse pt-4">
             <div className="h-40 bg-surface-muted w-full rounded-social"></div>
             <div className="h-40 bg-surface-muted w-full rounded-social"></div>
          </div>
        ) : messages.length === 0 ? (
          <Card className="text-center py-10 border border-border-light">
             <div className="flex justify-center mb-3"><div className="p-4 bg-surface-muted rounded-full"><Edit3 size={32} className="text-ink-muted"/></div></div>
             <p className="text-ink-body font-medium text-[15px]">The board is quiet.</p>
             <p className="text-ink-muted text-sm mt-1">Start the conversation by posting above!</p>
          </Card>
        ) : (
          messages.map(msg => (
             <Card key={msg.id} className="!p-0 border border-border-light shadow-social-card overflow-visible">
               <div className="p-4 flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {msg.author_name.charAt(0)}
                  </div>
                  <div className="flex flex-col w-full">
                     <span className="font-bold text-[15px] text-ink-title leading-tight">{msg.author_name}</span>
                     <span className="text-[12px] text-ink-muted font-medium mt-0.5">
                        {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                     </span>
                     
                     <p className="mt-3 text-[15px] text-ink-title whitespace-pre-line leading-relaxed">{msg.content}</p>
                     
                     {/* Reactions Display */}
                     {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                           {msg.reactions.map((r, idx) => (
                               <div key={idx} className="flex items-center gap-1 bg-surface-muted px-2 py-1 rounded-full text-sm border border-border-light shadow-sm">
                                  <span>{r.emoji}</span>
                                  <span className="text-ink-body font-semibold">{r.count}</span>
                               </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>

               {/* Action Bar */}
               <div className="px-4 py-1.5 border-t border-border-light flex justify-start gap-2 relative">
                  <button 
                     onClick={() => setActiveEmojiPicker(activeEmojiPicker === msg.id ? null : msg.id)}
                     className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-[14px]"
                  >
                     <Smile size={18} strokeWidth={2}/> React
                  </button>
                  <button 
                     onClick={() => { setCommentingOn(msg.id); setCommentText(""); }}
                     className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-surface-hover transition-colors text-ink-body font-semibold text-[14px]"
                  >
                     <MessageCircle size={18} strokeWidth={2}/> {msg.comments?.length || 0} Comments
                  </button>

                  {/* Emoji Picker Popover */}
                  {activeEmojiPicker === msg.id && (
                      <div className="absolute bottom-full left-0 mb-2 z-50 shadow-social-dropdown rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                         <Picker onEmojiClick={(emoji) => handleReaction(msg.id, emoji)} theme="auto" />
                      </div>
                  )}
               </div>

               {/* Comments Section */}
               {(msg.comments?.length > 0 || commentingOn === msg.id) && (
                  <div className="px-4 pb-4 pt-2 bg-surface-muted/30 border-t border-border-light">
                     {msg.comments?.map((c, idx) => (
                        <div key={idx} className="flex gap-2 mb-3 last:mb-0">
                           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {c.author_name.charAt(0)}
                           </div>
                           <div className="bg-surface-muted px-3 py-2 rounded-2xl rounded-tl-sm flex-1">
                              <span className="font-bold text-[13px] text-ink-title block">{c.author_name}</span>
                              <span className="text-[14px] text-ink-title block mt-0.5">{c.content}</span>
                           </div>
                        </div>
                     ))}

                     {/* Comment Composer */}
                     {commentingOn === msg.id && (
                        <div className="flex gap-2 mt-3 items-end">
                           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-400 to-brand-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-sm mb-1">
                               {user.name.charAt(0)}
                           </div>
                           <div className="flex-1 relative">
                              <textarea 
                                 autoFocus
                                 value={commentText}
                                 onChange={e => setCommentText(e.target.value)}
                                 placeholder="Write a comment..."
                                 className="social-textarea min-h-[40px] text-[14px] py-2 pr-10 rounded-2xl"
                                 onKeyDown={e => {
                                     if (e.key === 'Enter' && !e.shiftKey) {
                                         e.preventDefault();
                                         handlePostComment(msg.id);
                                     }
                                 }}
                              />
                              <button 
                                 onClick={() => handlePostComment(msg.id)}
                                 className="absolute right-2 bottom-2 p-1.5 bg-brand-50 text-brand-500 rounded-full hover:bg-brand-100 transition-colors"
                              >
                                 <Send size={16} strokeWidth={2.5}/>
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               )}
             </Card>
          ))
        )}
      </div>
    </div>
  );
}
