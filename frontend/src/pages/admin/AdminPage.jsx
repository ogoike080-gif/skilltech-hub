import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, CreditCard, Video,
  Award, TrendingUp, Shield, Bell, ChevronRight,
  UserCheck, Ban, Eye, CheckCircle, XCircle, BarChart2
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
        <div className="text-white/50 text-sm">{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────
function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Platform Overview</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}     label="Total Users"    value={stats?.users?.total}      sub={`${stats?.users?.students || 0} students`}    color="#6366f1" />
        <StatCard icon={BookOpen}  label="Courses"        value={stats?.courses?.total}    sub={`${stats?.courses?.published || 0} published`} color="#06b6d4" />
        <StatCard icon={CreditCard} label="Revenue"       value={`$${Number(stats?.revenue?.total || 0).toLocaleString()}`} sub={`${stats?.revenue?.transactions || 0} transactions`} color="#10b981" />
        <StatCard icon={Video}     label="Live Sessions"  value={stats?.sessions?.total}   sub={`${stats?.sessions?.live_now || 0} live now`}  color="#ef4444" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent signups chart */}
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-400" /> New Users (Last 30 Days)
          </h3>
          {stats?.recentSignups?.length > 0 ? (
            <div className="flex items-end gap-1 h-32">
              {stats.recentSignups.slice(-20).map((row, i) => {
                const max = Math.max(...stats.recentSignups.map(r => r.n));
                const h = max > 0 ? Math.round((row.n / max) * 100) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-6 bg-surface-50 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {row.d}: {row.n}
                    </div>
                    <div className="w-full rounded-t-sm bg-brand-500/80 hover:bg-brand-400 transition-colors"
                      style={{ height: `${Math.max(h, 4)}%` }} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-white/30 text-sm">No signup data yet</div>
          )}
        </div>

        {/* Quick stats */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-brand-400" /> Platform Health
          </h3>
          {[
            { label: 'Instructors',        value: stats?.users?.instructors || 0,                      color: '#6366f1' },
            { label: 'Published Courses',  value: stats?.courses?.published || 0,                      color: '#06b6d4' },
            { label: 'Certificates Issued',value: stats?.certs?.total || 0,                            color: '#10b981' },
            { label: 'Successful Payments',value: stats?.revenue?.transactions || 0,                   color: '#f59e0b' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-white/60 text-sm">{item.label}</span>
              <span className="font-bold text-white">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole]     = useState('');
  const [page, setPage]     = useState(1);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/admin/users', { params: { search, role, page, limit: 15 } })
      .then(r => setUsers(r.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [search, role, page]);

  const updateRole = async (id, newRole) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role: newRole });
      toast.success('Role updated');
      fetchUsers();
    } catch { toast.error('Failed to update role'); }
  };

  const toggleBan = async (id, isBanned) => {
    try {
      await api.put(`/admin/users/${id}/ban`, { banned: !isBanned });
      toast.success(!isBanned ? 'User banned' : 'User unbanned');
      fetchUsers();
    } catch { toast.error('Failed to update user'); }
  };

  const roleColors = { admin:'#ef4444', instructor:'#6366f1', mentor:'#8b5cf6', student:'#10b981' };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="input flex-1" placeholder="Search by name or email..." />
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className="input w-40">
          <option value="">All Roles</option>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="mentor">Mentor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {['User','Role','Provider','Status','Joined','Actions'].map(h => (
                <th key={h} className="text-left text-white/40 font-medium px-4 py-3 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img src={`https://api.dicebear.com/8.x/initials/svg?seed=${u.first_name}`}
                      alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">{u.first_name} {u.last_name}</p>
                      <p className="text-white/40 text-xs">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                    className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-surface-100 cursor-pointer"
                    style={{ color: roleColors[u.role] || '#fff' }}>
                    <option value="student">Student</option>
                    <option value="instructor">Instructor</option>
                    <option value="mentor">Mentor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className="badge bg-white/5 text-white/50 text-xs capitalize">{u.oauth_provider || 'email'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${u.is_active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                    {u.is_active ? 'Active' : 'Banned'}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/40 text-xs">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleBan(u.id, !u.is_active)}
                    className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'hover:bg-red-500/15 text-white/40 hover:text-red-400' : 'hover:bg-green-500/15 text-white/40 hover:text-green-400'}`}
                    title={u.is_active ? 'Ban user' : 'Unban user'}>
                    {u.is_active ? <Ban size={14} /> : <UserCheck size={14} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-white/40 text-sm">{users.length} users shown</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5">← Prev</button>
          <span className="px-3 py-1.5 text-white/60 text-sm">Page {page}</span>
          <button onClick={() => setPage(p => p+1)} disabled={users.length < 15} className="btn-secondary text-sm px-3 py-1.5">Next →</button>
        </div>
      </div>
    </div>
  );
}

// ── Courses Tab ───────────────────────────────────────────
function CoursesTab() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/courses').then(r => setCourses(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const togglePublish = async (id, isPublished) => {
    try {
      await api.put(`/admin/courses/${id}/publish`, { published: !isPublished });
      toast.success(!isPublished ? 'Course published' : 'Course unpublished');
      setCourses(cs => cs.map(c => c.id === id ? { ...c, is_published: !isPublished } : c));
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              {['Course','Instructor','School','Students','Status','Actions'].map(h => (
                <th key={h} className="text-left text-white/40 font-medium px-4 py-3 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse"/></td></tr>
              ))
            ) : courses.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No courses yet</td></tr>
            ) : courses.map(c => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-white font-medium truncate max-w-[200px]">{c.title}</p>
                  <p className="text-white/40 text-xs">${c.price}</p>
                </td>
                <td className="px-4 py-3 text-white/70">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-white/50 text-xs">{c.school_name}</td>
                <td className="px-4 py-3 text-white/70">{c.total_students}</td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${c.is_published ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                    {c.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => togglePublish(c.id, c.is_published)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/40 hover:text-white"
                    title={c.is_published ? 'Unpublish' : 'Publish'}>
                    {c.is_published ? <XCircle size={15} className="text-red-400" /> : <CheckCircle size={15} className="text-green-400" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Payments Tab ──────────────────────────────────────────
function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/admin/payments').then(r => setPayments(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const statusColor = { success:'text-green-400 bg-green-500/15', pending:'text-yellow-400 bg-yellow-500/15', failed:'text-red-400 bg-red-500/15', refunded:'text-blue-400 bg-blue-500/15' };

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {['User','Course','Provider','Amount','Status','Date'].map(h => (
              <th key={h} className="text-left text-white/40 font-medium px-4 py-3 text-xs uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [...Array(6)].map((_, i) => <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse"/></td></tr>)
          ) : payments.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-white/30">No payments yet</td></tr>
          ) : payments.map(p => (
            <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
              <td className="px-4 py-3">
                <p className="text-white">{p.first_name} {p.last_name}</p>
                <p className="text-white/40 text-xs">{p.email}</p>
              </td>
              <td className="px-4 py-3 text-white/60 text-xs truncate max-w-[140px]">{p.course_title || '—'}</td>
              <td className="px-4 py-3"><span className="badge bg-white/5 text-white/50 text-xs capitalize">{p.provider}</span></td>
              <td className="px-4 py-3 text-white font-medium">${p.amount}</td>
              <td className="px-4 py-3"><span className={`badge text-xs ${statusColor[p.status] || 'text-white/50'}`}>{p.status}</span></td>
              <td className="px-4 py-3 text-white/40 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────
function SessionsTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get('/admin/sessions').then(r => setSessions(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  const statusColor = { live:'text-red-400 bg-red-500/15', scheduled:'text-blue-400 bg-blue-500/15', ended:'text-white/40 bg-white/5', cancelled:'text-yellow-400 bg-yellow-500/15' };

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {['Session','Instructor','Scheduled','Participants','Status'].map(h => (
              <th key={h} className="text-left text-white/40 font-medium px-4 py-3 text-xs uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse"/></td></tr>)
          ) : sessions.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-white/30">No sessions yet</td></tr>
          ) : sessions.map(s => (
            <tr key={s.id} className="border-b border-white/5 hover:bg-white/3">
              <td className="px-4 py-3 text-white font-medium truncate max-w-[200px]">{s.title}</td>
              <td className="px-4 py-3 text-white/60">{s.first_name} {s.last_name}</td>
              <td className="px-4 py-3 text-white/50 text-xs">{new Date(s.scheduled_at).toLocaleString([], { dateStyle:'short', timeStyle:'short' })}</td>
              <td className="px-4 py-3 text-white/70">{s.current_participants}</td>
              <td className="px-4 py-3"><span className={`badge text-xs capitalize ${statusColor[s.status] || ''}`}>{s.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────
const TABS = [
  { id: 'overview',  icon: LayoutDashboard, label: 'Overview'  },
  { id: 'users',     icon: Users,           label: 'Users'     },
  { id: 'courses',   icon: BookOpen,        label: 'Courses'   },
  { id: 'payments',  icon: CreditCard,      label: 'Payments'  },
  { id: 'sessions',  icon: Video,           label: 'Sessions'  },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield size={22} className="text-brand-400" /> Admin Panel
          </h1>
          <p className="text-white/50 mt-1">Manage your SkillTech Hub platform</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-surface-50 rounded-xl p-1 w-fit overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview'  && <Overview />}
        {activeTab === 'users'     && <UsersTab />}
        {activeTab === 'courses'   && <CoursesTab />}
        {activeTab === 'payments'  && <PaymentsTab />}
        {activeTab === 'sessions'  && <SessionsTab />}
      </div>
    </div>
  );
}
