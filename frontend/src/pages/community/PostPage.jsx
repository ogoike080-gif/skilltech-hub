import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ThumbsUp, MessageSquare, ArrowLeft, Send } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectIsAuth } from '../../store';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAuth = useSelector(selectIsAuth);

  useEffect(() => {
    api.get(`/community/posts/${id}`)
      .then(r => setPost(r.data.data))
      .finally(() => setLoading(false));
  }, [id]);

  const submitReply = async () => {
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/community/posts/${id}/reply`, { body: reply });
      toast.success('Reply posted!');
      setReply('');
      const r = await api.get(`/community/posts/${id}`);
      setPost(r.data.data);
    } catch { toast.error('Failed to post reply'); }
    finally { setSubmitting(false); }
  };

  const vote = async () => {
    if (!isAuth) { toast.error('Login to vote'); return; }
    try {
      const { data } = await api.post(`/community/posts/${id}/vote`, { value: 1 });
      setPost(p => ({ ...p, vote_count: data.data.voteCount }));
    } catch {}
  };

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-24 min-h-screen"><div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="card h-16 animate-pulse bg-white/5" />)}</div></div>;
  if (!post)   return <div className="max-w-3xl mx-auto px-4 py-24 text-center"><p className="text-white/40">Post not found</p><Link to="/community" className="btn-primary mt-4 inline-block">Back</Link></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-24 min-h-screen">
      <Link to="/community" className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Community
      </Link>

      {/* Post */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <img src={post.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${post.first_name}`}
            alt="" className="w-10 h-10 rounded-full" />
          <div>
            <p className="text-white font-semibold">{post.first_name} {post.last_name}</p>
            <p className="text-white/40 text-xs">{post.category_name} · {new Date(post.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        {post.title && <h1 className="text-2xl font-bold text-white mb-3">{post.title}</h1>}
        <div className="text-white/80 leading-relaxed whitespace-pre-wrap mb-5">{post.body}</div>
        <div className="flex items-center gap-4 pt-4 border-t border-white/10">
          <button onClick={vote} className="flex items-center gap-2 text-white/50 hover:text-brand-400 transition-colors text-sm">
            <ThumbsUp size={15} /> {post.vote_count} upvotes
          </button>
          <span className="flex items-center gap-2 text-white/30 text-sm">
            <MessageSquare size={15} /> {post.reply_count} replies
          </span>
        </div>
      </div>

      {/* Replies */}
      {post.replies?.length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-white">{post.replies.length} Replies</h2>
          {post.replies.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <img src={r.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${r.first_name}`}
                  alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                <div>
                  <p className="text-white font-medium text-sm">{r.first_name} {r.last_name}</p>
                  <p className="text-white/30 text-xs">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply form */}
      {isAuth ? (
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Leave a Reply</h3>
          <textarea value={reply} onChange={e => setReply(e.target.value)}
            className="input resize-none w-full mb-3" rows={4}
            placeholder="Share your thoughts or answer the question..." />
          <button onClick={submitReply} disabled={submitting || !reply.trim()}
            className="btn-primary flex items-center gap-2">
            {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={15} />}
            {submitting ? 'Posting...' : 'Post Reply'}
          </button>
        </div>
      ) : (
        <div className="card text-center py-8">
          <p className="text-white/40 mb-3">Login to join the discussion</p>
          <Link to="/login" className="btn-primary inline-block">Sign In</Link>
        </div>
      )}
    </div>
  );
}
