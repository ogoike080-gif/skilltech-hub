import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Clock, ArrowLeft, Calendar } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectIsAuth } from '../../store';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function MentorDetailPage() {
  const { id }  = useParams();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [form, setForm] = useState({ scheduledAt: '', topic: '', notes: '' });
  const isAuth = useSelector(selectIsAuth);

  useEffect(() => {
    api.get(`/mentors/${id}`).then(r => setMentor(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  const book = async () => {
    if (!form.scheduledAt) { toast.error('Please select a date and time'); return; }
    try {
      await api.post('/mentors/book', { mentorId: id, ...form });
      toast.success('Session booked! Check your email for confirmation.');
      setForm({ scheduledAt: '', topic: '', notes: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Booking failed'); }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-24"><div className="card h-64 animate-pulse bg-white/5" /></div>;
  if (!mentor) return <div className="max-w-4xl mx-auto px-4 py-24 text-center"><p className="text-white/40">Mentor not found</p><Link to="/mentors" className="btn-primary mt-4 inline-block">Back</Link></div>;

  const specialties = typeof mentor.specialties === 'string' ? JSON.parse(mentor.specialties) : mentor.specialties || [];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-24 min-h-screen">
      <Link to="/mentors" className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Mentors
      </Link>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start gap-4">
              <img src={mentor.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${mentor.first_name}`}
                alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
              <div>
                <h1 className="text-2xl font-bold text-white">{mentor.first_name} {mentor.last_name}</h1>
                <p className="text-white/50">{mentor.headline}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-yellow-400"><Star size={14} fill="currentColor" />{mentor.avg_rating || '—'}</span>
                  <span className="text-white/30 text-sm">{mentor.total_sessions} sessions completed</span>
                  <span className="badge bg-green-500/15 text-green-400 text-sm">{mentor.experience_yrs}+ years</span>
                </div>
              </div>
            </div>
            {mentor.bio && <p className="text-white/60 mt-4 leading-relaxed">{mentor.bio}</p>}
          </div>
          {specialties.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-white mb-3">Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {specialties.map(s => <span key={s} className="badge bg-brand-500/15 text-brand-300 px-3 py-1">{s}</span>)}
              </div>
            </div>
          )}
          {mentor.availability?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-white mb-3 flex items-center gap-2"><Clock size={16} className="text-brand-400" />Availability</h2>
              <div className="grid grid-cols-2 gap-2">
                {mentor.availability.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                    <span className="w-10 text-brand-400 font-medium">{days[a.day_of_week]}</span>
                    <span>{a.start_time} – {a.end_time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking panel */}
        <div className="card h-fit sticky top-24">
          <div className="text-3xl font-black text-white mb-1">${mentor.hourly_rate}<span className="text-white/40 text-base font-normal">/hr</span></div>
          <p className="text-white/40 text-sm mb-5">Book a 1-on-1 session</p>
          {isAuth ? (
            <div className="space-y-3">
              <div>
                <label className="text-white/60 text-xs mb-1 block">Date & Time</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({...form, scheduledAt: e.target.value})} className="input text-sm" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Topic</label>
                <input value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} className="input text-sm" placeholder="What do you want to discuss?" />
              </div>
              <div>
                <label className="text-white/60 text-xs mb-1 block">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input text-sm resize-none" rows={3} />
              </div>
              <button onClick={book} className="btn-primary w-full flex items-center justify-center gap-2">
                <Calendar size={16} /> Book Session
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white/40 text-sm mb-3">Login to book a session</p>
              <Link to="/login" className="btn-primary block text-center">Sign In</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
