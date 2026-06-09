import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Eye, Plus, Search, Filter } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectIsAuth } from '../../store';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function CreatePostModal({ categories, onClose, onCreated }) {
  const [form, setForm] = useState({ categoryId: categories[0]?.id || '', title: '', body: '', type: 'discussion' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.categoryId || !form.body.trim()) { toast.error('Category and content required'); return; }
    setLoading(true);
    try {
      await api.post('/community/posts', form);
      toast.success('Post created!');
      onCreated(); onClose();
    } catch { toast.error('Failed to create post'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-50 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Plus size={18} className="text-brand-400" /> New Post</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Category *</label>
              <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} className="input">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input">
                <option value="discussion">Discussion</option>
                <option value="question">Question</option>
                <option value="project">Project Showcase</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-white/60 text-sm mb-1 block">Title</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input" placeholder="Post title (optional)" />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-1 block">Content *</label>
            <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} className="input resize-none" rows={5} placeholder="Share your thoughts, question, or project..." required />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
              {loading ? 'Posting...' : 'Create Post'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TYPE_BADGE = {
  question:   'bg-blue-500/15 text-blue-400',
  discussion: 'bg-purple-500/15 text-purple-400',
  project:    'bg-green-500/15 text-green-400',
  announcement: 'bg-yellow-500/15 text-yellow-400',
};

export default function CommunityPage() {
  const [posts, setPosts]         = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [sort, setSort]           = useState('newest');
  const [showCreate, setShowCreate] = useState(false);
  const isAuth = useSelector(selectIsAuth);

  const fetchPosts = () => {
    setLoading(true);
    api.get('/community/posts', { params: { search, category: activeCategory, sort, limit: 20 } })
      .then(r => setPosts(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/community/categories').then(r => setCategories(r.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchPosts(); }, [search, activeCategory, sort]);

  const handleVote = async (postId) => {
    if (!isAuth) { toast.error('Login to vote'); return; }
    try {
      const { data } = await api.post(`/community/posts/${postId}/vote`, { value: 1 });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, vote_count: data.data.voteCount } : p));
    } catch { toast.error('Failed to vote'); }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-24 min-h-screen">
      {showCreate && categories.length > 0 && (
        <CreatePostModal categories={categories} onClose={() => setShowCreate(false)} onCreated={fetchPosts} />
      )}

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">Community</h1>
          <p className="text-white/50 mt-2">Discuss, share projects, ask questions, collaborate</p>
        </div>
        {isAuth && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Post
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar — categories */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="card">
            <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">Categories</h3>
            <div className="space-y-1">
              <button onClick={() => setActiveCategory('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!activeCategory ? 'bg-brand-500/20 text-brand-300' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                All Posts
              </button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.slug)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${activeCategory === cat.slug ? 'bg-brand-500/20 text-brand-300' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                  <span style={{ color: cat.color }}>●</span> {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search + sort bar */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="input pl-9" placeholder="Search posts..." />
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} className="input w-36">
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
              <option value="active">Most Active</option>
            </select>
          </div>

          {/* Posts */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-white/5" />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="card text-center py-16">
              <MessageSquare size={40} className="text-white/10 mx-auto mb-3" />
              <p className="text-white font-semibold mb-2">No posts yet</p>
              <p className="text-white/40 text-sm mb-4">Be the first to start a discussion!</p>
              {isAuth && (
                <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 mx-auto">
                  <Plus size={16} /> Create Post
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <Link key={post.id} to={`/community/${post.id}`}
                  className="card-hover block group">
                  <div className="flex items-start gap-3">
                    <img src={post.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${post.first_name}`}
                      alt="" className="w-9 h-9 rounded-full flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`badge text-xs capitalize ${TYPE_BADGE[post.type] || 'bg-white/5 text-white/40'}`}>
                          {post.type}
                        </span>
                        <span className="badge bg-white/5 text-white/40 text-xs" style={{ color: post.category_color }}>
                          {post.category_name}
                        </span>
                        {post.is_pinned && <span className="badge bg-yellow-500/15 text-yellow-400 text-xs">📌 Pinned</span>}
                      </div>
                      {post.title && (
                        <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors mb-1">
                          {post.title}
                        </h3>
                      )}
                      <p className="text-white/50 text-sm line-clamp-2">{post.preview || post.body?.substring(0, 160)}</p>
                      <div className="flex items-center gap-4 mt-2 text-white/30 text-xs">
                        <span className="font-medium text-white/50">{post.first_name} {post.last_name}</span>
                        <button onClick={e => { e.preventDefault(); handleVote(post.id); }}
                          className="flex items-center gap-1 hover:text-brand-400 transition-colors">
                          <ThumbsUp size={12} /> {post.vote_count}
                        </button>
                        <span className="flex items-center gap-1"><MessageSquare size={12} /> {post.reply_count}</span>
                        <span className="flex items-center gap-1"><Eye size={12} /> {post.view_count}</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
