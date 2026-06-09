import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Star, Users, Clock } from 'lucide-react';
import api from '../../utils/api';

export default function SchoolPage() {
  const { slug } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/schools/${slug}`).then(r => setSchool(r.data.data)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-24"><div className="h-40 card animate-pulse bg-white/5"/></div>;
  if (!school) return <div className="max-w-7xl mx-auto px-4 py-24 text-center"><p className="text-white/40">School not found</p></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-24 min-h-screen">
      <Link to="/schools" className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16}/> All Schools
      </Link>
      <div className="flex items-center gap-4 mb-10">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: `${school.color}20` }}>
          <BookOpen size={32} style={{ color: school.color }}/>
        </div>
        <div>
          <h1 className="text-4xl font-black text-white">{school.name}</h1>
          <p className="text-white/50 mt-1">{school.description}</p>
        </div>
      </div>
      {school.courses?.length === 0 ? (
        <div className="card text-center py-16"><BookOpen size={40} className="text-white/10 mx-auto mb-3"/><p className="text-white/40">No courses in this school yet</p></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {(school.courses || []).map(c => (
            <Link key={c.id} to={`/courses/${c.slug}`} className="card-hover group">
              {c.thumbnail_url
                ? <img src={c.thumbnail_url} alt="" className="w-full h-40 object-cover rounded-xl mb-3"/>
                : <div className="w-full h-40 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: `${school.color}15` }}><BookOpen size={36} style={{ color: school.color }}/></div>
              }
              <span className={`badge text-xs mb-2 capitalize ${c.level === 'beginner' ? 'bg-green-500/15 text-green-400' : c.level === 'intermediate' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'}`}>{c.level}</span>
              <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors line-clamp-2 mb-2">{c.title}</h3>
              <div className="flex items-center gap-3 text-xs text-white/40">
                <span className="flex items-center gap-1"><Star size={11} className="text-yellow-400 fill-yellow-400"/>{c.avg_rating || '—'}</span>
                <span className="flex items-center gap-1"><Users size={11}/>{c.total_students}</span>
              </div>
              <div className="mt-2 font-bold text-white">{c.is_free ? <span className="text-green-400">Free</span> : `$${c.price}`}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
