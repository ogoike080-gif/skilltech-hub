// ============================================================
// pages/dashboard/DashboardPage.jsx
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Award, Flame, Clock, Video, Play, TrendingUp, ChevronRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store';
import api from '../../utils/api';

export default function DashboardPage() {
  const user = useSelector(selectUser);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/users/dashboard').then(r => setData(r.data.data)).catch(() => {});
  }, []);

  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const { stats, recentCourses, upcomingClasses, recentCerts } = data;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Welcome back, {user?.firstName}! 👋</h1>
        <p className="text-white/50 mt-1">Here's what's happening with your learning journey.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'Enrolled', value: stats.total,    color: '#6366f1' },
          { icon: Award,    label: 'Completed', value: stats.completed, color: '#10b981' },
          { icon: Flame,    label: 'Day Streak', value: `${stats.streak}d`, color: '#f59e0b' },
          { icon: TrendingUp, label: 'Points', value: stats.totalPoints?.toLocaleString(), color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: `${s.color}20` }}>
              <s.icon size={22} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{s.value ?? 0}</div>
              <div className="text-white/50 text-sm">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Continue learning */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Continue Learning</h2>
            <Link to="/courses/my-courses" className="text-brand-400 text-sm hover:text-brand-300 flex items-center gap-1">All courses <ChevronRight size={14} /></Link>
          </div>
          {recentCourses.length === 0
            ? <div className="card text-center py-12"><p className="text-white/40">No courses yet. <Link to="/courses" className="text-brand-400">Browse courses →</Link></p></div>
            : <div className="space-y-4">
                {recentCourses.map(course => (
                  <Link key={course.id} to={`/learn/${course.id}`} className="card-hover flex gap-4 items-center">
                    {course.thumbnail_url
                      ? <img src={course.thumbnail_url} alt="" className="w-20 h-14 object-cover rounded-lg flex-shrink-0" />
                      : <div className="w-20 h-14 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: `${course.color}20` }}><BookOpen size={20} style={{ color: course.color }} /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{course.title}</h3>
                      <p className="text-white/40 text-sm">{course.school_name}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-white/10 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${course.progress_pct}%` }} />
                        </div>
                        <span className="text-white/50 text-xs">{course.progress_pct}%</span>
                      </div>
                    </div>
                    <Play size={18} className="text-brand-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
          }
        </div>

        {/* Upcoming classes + certs */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Upcoming Classes</h2>
            {upcomingClasses.length === 0
              ? <div className="card text-center py-8"><p className="text-white/40 text-sm">No upcoming classes</p></div>
              : <div className="space-y-3">
                  {upcomingClasses.map(s => (
                    <Link key={s.id} to={`/classroom/${s.id}`} className="card-hover flex gap-3 items-start">
                      <div className="p-2 bg-red-500/10 rounded-lg flex-shrink-0"><Video size={16} className="text-red-400" /></div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{s.title}</p>
                        <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5"><Clock size={10} />{new Date(s.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                      </div>
                    </Link>
                  ))}
                </div>
            }
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Certificates</h2>
              <Link to="/certificates" className="text-brand-400 text-sm hover:text-brand-300">View all</Link>
            </div>
            {recentCerts.length === 0
              ? <div className="card text-center py-8"><Award size={32} className="text-white/20 mx-auto mb-2" /><p className="text-white/40 text-sm">Complete a course to earn your first certificate</p></div>
              : <div className="space-y-3">
                  {recentCerts.map(c => (
                    <div key={c.id} className="card flex items-center gap-3">
                      <Award size={20} style={{ color: c.color }} />
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">{c.title}</p>
                        <p className="text-white/40 text-xs">{c.school_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
