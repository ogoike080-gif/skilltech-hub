import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Users, Clock, Search } from 'lucide-react';
import api from '../../utils/api';

export default function MentorsPage() {
  const [mentors, setMentors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [minRate, setMinRate]   = useState('');
  const [maxRate, setMaxRate]   = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/mentors', { params: { minRate: minRate || undefined, maxRate: maxRate || undefined } })
      .then(r => setMentors(r.data.data || []))
      .finally(() => setLoading(false));
  }, [minRate, maxRate]);

  const filtered = mentors.filter(m =>
    !search || `${m.first_name} ${m.last_name} ${m.headline}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-24 min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Find a Mentor</h1>
        <p className="text-white/50">Book 1-on-1 sessions with industry professionals</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search mentors..." />
        </div>
        <input type="number" value={minRate} onChange={e => setMinRate(e.target.value)} className="input w-32" placeholder="Min $/hr" />
        <input type="number" value={maxRate} onChange={e => setMaxRate(e.target.value)} className="input w-32" placeholder="Max $/hr" />
      </div>
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(6)].map((_,i) => <div key={i} className="card h-48 animate-pulse bg-white/5"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16"><p className="text-white/40">No mentors found</p></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(m => (
            <Link key={m.id} to={`/mentors/${m.id}`} className="card-hover group">
              <div className="flex items-start gap-3 mb-4">
                <img src={m.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${m.first_name}`}
                  alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-bold text-white group-hover:text-brand-300 transition-colors">{m.first_name} {m.last_name}</h3>
                  <p className="text-white/50 text-sm truncate">{m.headline}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400 text-sm">{m.avg_rating || '—'}</span>
                    <span className="text-white/30 text-xs">({m.total_sessions} sessions)</span>
                  </div>
                </div>
              </div>
              {m.specialties && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {(typeof m.specialties === 'string' ? JSON.parse(m.specialties) : m.specialties).slice(0, 3).map(s => (
                    <span key={s} className="badge bg-brand-500/15 text-brand-300 text-xs">{s}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-white font-bold text-lg">${m.hourly_rate}<span className="text-white/40 text-sm font-normal">/hr</span></span>
                <span className="badge bg-green-500/15 text-green-400 text-xs">{m.experience_yrs}+ yrs exp</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
