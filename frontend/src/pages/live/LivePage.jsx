import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Video, Clock, Users, Calendar, Plus, Radio, Play } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectUser, selectIsAuth } from '../../store';
import api from '../../utils/api';

function SessionCard({ session, isLive }) {
  const isAuth = useSelector(selectIsAuth);
  return (
    <div className={`card-hover ${isLive ? 'border-red-500/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${isLive ? 'bg-red-500/10' : 'bg-brand-500/10'}`}>
          <Video size={18} className={isLive ? 'text-red-400' : 'text-brand-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {isLive && (
              <span className="flex items-center gap-1 badge bg-red-500/20 text-red-400 text-xs">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />LIVE
              </span>
            )}
            {session.course_title && (
              <span className="badge bg-white/5 text-white/40 text-xs truncate max-w-[140px]">
                {session.course_title}
              </span>
            )}
            {session.price > 0 && (
              <span className="badge bg-blue-500/15 text-blue-400 text-xs">${session.price}</span>
            )}
            {!session.price && <span className="badge bg-green-500/15 text-green-400 text-xs">Free</span>}
          </div>
          <h3 className="font-semibold text-white">{session.title}</h3>
          {session.description && (
            <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{session.description}</p>
          )}
          <div className="flex items-center gap-3 text-white/40 text-xs mt-1.5 flex-wrap">
            <span className="flex items-center gap-1">
              <img src={session.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session.first_name}`}
                alt="" className="w-4 h-4 rounded-full" />
              {session.first_name} {session.last_name}
            </span>
            {!isLive && (
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {new Date(session.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
            <span className="flex items-center gap-1"><Clock size={11} />{session.duration_min}m</span>
            {isLive && (
              <span className="flex items-center gap-1 text-red-400">
                <Users size={11} />{session.current_participants} watching
              </span>
            )}
          </div>
        </div>
        {isAuth && (
          <Link to={`/classroom/${session.id}`}
            className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold transition-all flex-shrink-0 ${
              isLive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-surface-100 hover:bg-brand-500/20 text-white/70 hover:text-white border border-white/10'
            }`}>
            {isLive ? <><Play size={12} fill="white" /> Join Now</> : 'View'}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function LivePage() {
  const [sessions, setSessions] = useState({ scheduled: [], live: [], ended: [] });
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('upcoming');
  const user = useSelector(selectUser);

  useEffect(() => {
    Promise.all([
      api.get('/live?status=scheduled&limit=20'),
      api.get('/live?status=live&limit=10'),
      api.get('/live?status=ended&limit=10'),
    ]).then(([sched, live, ended]) => {
      setSessions({
        scheduled: sched.data.data || [],
        live:      live.data.data  || [],
        ended:     ended.data.data || [],
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const allUpcoming = sessions.live.length + sessions.scheduled.length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-24 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white">Live Classes</h1>
          <p className="text-white/50 mt-2">Join expert-led sessions and interact in real time</p>
        </div>
        {(user?.role === 'instructor' || user?.role === 'admin') && (
          <Link to="/instructor" className="btn-primary flex items-center gap-2 text-sm">
            <Radio size={16} /> Go to Instructor Portal
          </Link>
        )}
      </div>

      {/* Live now banner */}
      {sessions.live.length > 0 && (
        <div className="mb-8 p-4 rounded-2xl border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-semibold">{sessions.live.length} class{sessions.live.length > 1 ? 'es' : ''} happening right now</span>
          </div>
          <div className="space-y-3">
            {sessions.live.map(s => <SessionCard key={s.id} session={s} isLive />)}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-50 rounded-xl p-1 w-fit mb-6">
        {[
          { id: 'upcoming', label: `Upcoming (${sessions.scheduled.length})` },
          { id: 'past',     label: `Past (${sessions.ended.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Session list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-white/5" />
          ))}
        </div>
      ) : tab === 'upcoming' ? (
        sessions.scheduled.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white font-semibold mb-2">No upcoming classes scheduled</p>
            <p className="text-white/40 text-sm">
              {user?.role === 'instructor' || user?.role === 'admin'
                ? 'Schedule your first live class from the Instructor Portal'
                : 'Check back soon — instructors will schedule new classes'}
            </p>
            {(user?.role === 'instructor' || user?.role === 'admin') && (
              <Link to="/instructor" className="btn-primary mt-4 inline-flex items-center gap-2">
                <Radio size={16} /> Schedule a Class
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.scheduled.map(s => <SessionCard key={s.id} session={s} />)}
          </div>
        )
      ) : (
        sessions.ended.length === 0 ? (
          <div className="card text-center py-16">
            <Video size={40} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/40">No past sessions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.ended.map(s => (
              <div key={s.id} className="card opacity-70">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/5">
                    <Video size={18} className="text-white/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white/70">{s.title}</h3>
                    <p className="text-white/30 text-xs">{new Date(s.scheduled_at).toLocaleDateString()} · {s.first_name} {s.last_name}</p>
                  </div>
                  {s.recording_url && (
                    <a href={s.recording_url} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                      <Play size={12} /> Watch Recording
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
