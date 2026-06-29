import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Video, Users, DollarSign, Plus, Eye,
  Edit, Trash2, Play, Calendar, Clock, CheckCircle,
  XCircle, BarChart2, Upload, Zap, Radio, ShieldAlert
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import HostClassCard from '../../components/live/HostClassCard';
import { useAuth } from '../../hooks';

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? '0'}</div>
        <div className="text-white/50 text-sm">{label}</div>
      </div>
    </div>
  );
}

// ── Locked Instructor Banner ──────────────────────────────
function InstructorStatusBanner({ instructorStatus }) {
  if (instructorStatus !== 'pending' && instructorStatus !== 'rejected') return null;

  const rejected = instructorStatus === 'rejected';

  return (
    <div className={`card flex items-start gap-3 border ${
      rejected ? 'border-red-500/30 bg-red-500/5' : 'border-yellow-500/30 bg-yellow-500/5'
    }`}>
      {rejected
        ? <ShieldAlert size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
        : <Clock size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />}
      <div>
        <p className="text-white font-medium text-sm">
          {rejected
            ? 'Your instructor application was not approved'
            : 'Your instructor account is pending approval'}
        </p>
        <p className="text-white/50 text-sm mt-0.5">
          {rejected
            ? 'Contact support if you believe this was a mistake.'
            : "You'll be able to create courses and schedule live classes once an admin approves your account. This usually takes 1–2 business days."}
        </p>
      </div>
    </div>
  );
}

// ── Schedule Live Session Modal ───────────────────────────
function ScheduleModal({ onClose, onScheduled }) {
  const [form, setForm] = useState({
    title: '', description: '', scheduledAt: '', durationMin: 60,
    maxParticipants: 100, isRecorded: true, isPublic: true, price: 0,
  });
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    api.get('/courses/instructor').then(r => setCourses(r.data.data || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.scheduledAt) { toast.error('Title and date required'); return; }
    setLoading(true);
    try {
      await api.post('/live', form);
      toast.success('Session scheduled!');
      onScheduled();
      onClose();
    } catch (err) {
      // api.js response interceptor already shows the error toast
      // for this request — no need to duplicate it here.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-50 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio size={18} className="text-red-400" /> Schedule Live Session
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-white/60 text-sm mb-1 block">Session Title *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="input" placeholder="e.g. Introduction to React Hooks" required />
          </div>

          <div>
            <label className="text-white/60 text-sm mb-1 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="input resize-none" rows={3} placeholder="What will you cover in this session?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Date & Time *</label>
              <input type="datetime-local" value={form.scheduledAt}
                onChange={e => setForm({...form, scheduledAt: e.target.value})}
                className="input" required />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">Duration (minutes)</label>
              <input type="number" value={form.durationMin} min={15} max={480}
                onChange={e => setForm({...form, durationMin: parseInt(e.target.value)})}
                className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Max Participants</label>
              <input type="number" value={form.maxParticipants} min={1}
                onChange={e => setForm({...form, maxParticipants: parseInt(e.target.value)})}
                className="input" />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">Price ($) — 0 = free</label>
              <input type="number" value={form.price} min={0} step={0.01}
                onChange={e => setForm({...form, price: parseFloat(e.target.value)})}
                className="input" />
            </div>
          </div>

          {courses.length > 0 && (
            <div>
              <label className="text-white/60 text-sm mb-1 block">Link to Course (optional)</label>
              <select value={form.courseId || ''} onChange={e => setForm({...form, courseId: e.target.value || undefined})}
                className="input">
                <option value="">— Standalone session —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isRecorded} onChange={e => setForm({...form, isRecorded: e.target.checked})}
                className="w-4 h-4 accent-brand-500" />
              <span className="text-white/70 text-sm">Record session</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPublic} onChange={e => setForm({...form, isPublic: e.target.checked})}
                className="w-4 h-4 accent-brand-500" />
              <span className="text-white/70 text-sm">Public session</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calendar size={16} />}
              {loading ? 'Scheduling...' : 'Schedule Session'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Course Modal ───────────────────────────────────
function CreateCourseModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', shortDesc: '', description: '', schoolId: '', level: 'beginner', type: 'self_paced', price: 0, isFree: true, language: 'en' });
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/schools').then(r => setSchools(r.data.data || [])).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.schoolId) { toast.error('Title and school required'); return; }
    setLoading(true);
    try {
      await api.post('/courses', form);
      toast.success('Course created!');
      onCreated(); onClose();
    } catch (err) {
      // api.js response interceptor already shows the error toast
      // for this request — no need to duplicate it here.
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-50 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen size={18} className="text-brand-400" /> Create Course</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-white/60 text-sm mb-1 block">Course Title *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input" placeholder="e.g. Complete React Developer" required />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-1 block">Short Description</label>
            <input value={form.shortDesc} onChange={e => setForm({...form, shortDesc: e.target.value})} className="input" placeholder="One-line summary" />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-1 block">Full Description</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-sm mb-1 block">School *</label>
              <select value={form.schoolId} onChange={e => setForm({...form, schoolId: e.target.value})} className="input" required>
                <option value="">Select school</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">Level</label>
              <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="input">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-sm mb-1 block">Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input">
                <option value="self_paced">Self-paced</option>
                <option value="live">Live</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">Price ($)</label>
              <input type="number" value={form.price} min={0} onChange={e => setForm({...form, price: parseFloat(e.target.value), isFree: parseFloat(e.target.value) === 0})} className="input" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
              {loading ? 'Creating...' : 'Create Course'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Instructor Page ──────────────────────────────────
const TABS = [
  { id: 'overview', icon: BarChart2, label: 'Overview'   },
  { id: 'courses',  icon: BookOpen,  label: 'My Courses' },
  { id: 'sessions', icon: Video,     label: 'Live Sessions' },
];

export default function InstructorPage() {
  const [activeTab, setActiveTab]     = useState('overview');
  const [courses, setCourses]         = useState([]);
  const [sessions, setSessions]       = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [loading, setLoading]         = useState(true);

  const { user } = useAuth();
  const instructorStatus = user?.instructorStatus; // 'pending' | 'approved' | 'rejected' | null
  const isLocked = instructorStatus === 'pending' || instructorStatus === 'rejected';
  const lockedTitle = isLocked ? 'Available once your instructor account is approved' : undefined;

 


const fetchData = async () => {
  setLoading(true);
  try {
    const [cRes, sessionsRes] = await Promise.all([
      api.get('/courses/instructor'),
      api.get('/live/my-sessions'),
    ]);
    setCourses(cRes.data.data || []);
    setSessions(sessionsRes.data.data || []);
  } catch {}
  setLoading(false);
};



  useEffect(() => { fetchData(); }, []);

  const totalStudents = courses.reduce((s, c) => s + (c.total_students || 0), 0);
  const totalRevenue  = courses.reduce((s, c) => s + parseFloat(c.revenue || 0), 0);

  const startSession = async (sessionId) => {
    try {
      await api.post(`/live/${sessionId}/start`);
      toast.success('Session started! 🔴 You are live');
      fetchData();
    } catch (err) {
      // interceptor handles the error toast
    }
  };

  const endSession = async (sessionId) => {
    try {
      await api.post(`/live/${sessionId}/end`);
      toast.success('Session ended');
      fetchData();
    } catch (err) {
      // interceptor handles the error toast
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} onScheduled={fetchData} />}
      {showCreateCourse && <CreateCourseModal onClose={() => setShowCreateCourse(false)} onCreated={fetchData} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap size={22} className="text-brand-400" /> Instructor Portal
          </h1>
          <p className="text-white/50 mt-1">Create courses, schedule live classes, track students</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateCourse(true)}
            disabled={isLocked}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            title={lockedTitle}
          >
            <Plus size={15} /> New Course
          </button>
          <button
            onClick={() => setShowSchedule(true)}
            disabled={isLocked}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            title={lockedTitle}
          >
            <Radio size={15} /> Schedule Live
          </button>
        </div>
      </div>

      <InstructorStatusBanner instructorStatus={instructorStatus} />

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-50 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
            }`}>
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={BookOpen}  label="My Courses"      value={courses.length}  color="#6366f1" />
            <StatCard icon={Users}     label="Total Students"  value={totalStudents}   color="#06b6d4" />
            <StatCard icon={DollarSign} label="Total Revenue"  value={`$${totalRevenue.toFixed(2)}`} color="#10b981" />
            <StatCard icon={Video}     label="Live Sessions"   value={sessions.length} color="#ef4444" />
          </div>

          {/* Recent courses preview */}
          {courses.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white mb-4">Recent Courses</h3>
              <div className="space-y-3">
                {courses.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{c.title}</p>
                      <p className="text-white/40 text-xs">{c.total_students} students · {c.school_name}</p>
                    </div>
                    <span className={`badge text-xs ${c.is_published ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                      {c.is_published ? 'Live' : 'Draft'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {courses.length === 0 && sessions.length === 0 && (
            <div className="card text-center py-16">
              <Zap size={48} className="text-white/10 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Start Teaching Today</h3>
              <p className="text-white/40 mb-6">Create your first course or schedule a live class</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowCreateCourse(true)}
                  disabled={isLocked}
                  className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={lockedTitle}
                >
                  <Plus size={16} /> Create Course
                </button>
                <button
                  onClick={() => setShowSchedule(true)}
                  disabled={isLocked}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={lockedTitle}
                >
                  <Radio size={16} /> Schedule Live
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Courses tab */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">My Courses ({courses.length})</h2>
            <button
              onClick={() => setShowCreateCourse(true)}
              disabled={isLocked}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              title={lockedTitle}
            >
              <Plus size={15} /> Create Course
            </button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-white/5" />)}
            </div>
          ) : courses.length === 0 ? (
            <div className="card text-center py-16">
              <BookOpen size={40} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/40">No courses yet. Create your first one!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {courses.map(c => (
                <div key={c.id} className="card-hover">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{c.title}</h3>
                      <p className="text-white/40 text-sm">{c.school_name} · {c.level}</p>
                    </div>
                    <span className={`badge text-xs ml-2 flex-shrink-0 ${c.is_published ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                      {c.is_published ? '● Live' : '○ Draft'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center mb-3">
                    <div>
                      <p className="text-lg font-bold text-white">{c.total_students}</p>
                      <p className="text-white/40 text-xs">Students</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{c.avg_rating || '—'}</p>
                      <p className="text-white/40 text-xs">Rating</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-400">${parseFloat(c.revenue || 0).toFixed(0)}</p>
                      <p className="text-white/40 text-xs">Revenue</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="badge bg-white/5 text-white/50 text-xs capitalize">{c.type?.replace('_', ' ')}</span>
                    {c.is_free && <span className="badge bg-green-500/15 text-green-400 text-xs">Free</span>}
                    {!c.is_free && <span className="badge bg-blue-500/15 text-blue-400 text-xs">${c.price}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sessions tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Live Sessions</h2>
            <button
              onClick={() => setShowSchedule(true)}
              disabled={isLocked}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              title={lockedTitle}
            >
              <Radio size={15} /> Schedule Session
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-white/5" />)}</div>
          ) : sessions.length === 0 ? (
            <div className="card text-center py-16">
              <Video size={40} className="text-white/10 mx-auto mb-3" />
              <p className="text-white/40 mb-4">No live sessions scheduled</p>
              <button
                onClick={() => setShowSchedule(true)}
                disabled={isLocked}
                className="btn-primary flex items-center gap-2 mx-auto disabled:opacity-40 disabled:cursor-not-allowed"
                title={lockedTitle}
              >
                <Radio size={16} /> Schedule Your First Class
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {sessions.map(s => (
                <HostClassCard key={s.id} session={s} onStarted={fetchData} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
