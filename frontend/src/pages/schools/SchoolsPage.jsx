import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Code, Brain, TrendingUp, Shield, Cloud, Palette, Megaphone } from 'lucide-react';
import api from '../../utils/api';

const ICONS = { 'software-engineering':Code, 'artificial-intelligence':Brain, 'data-science':TrendingUp, 'cybersecurity':Shield, 'cloud-computing':Cloud, 'product-design':Palette, 'digital-skills':Megaphone };

export default function SchoolsPage() {
  const [schools, setSchools] = useState([]);
  useEffect(() => { api.get('/schools').then(r => setSchools(r.data.data || [])).catch(() => {}); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-24 min-h-screen">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black text-white mb-4">Technology Schools</h1>
        <p className="text-white/50 text-xl max-w-2xl mx-auto">Choose your learning path. Each school offers structured courses designed with industry-relevant curriculum.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schools.map(school => {
          const Icon = ICONS[school.slug] || BookOpen;
          return (
            <Link key={school.id} to={`/schools/${school.slug}`} className="card-hover group">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-4 rounded-2xl" style={{ backgroundColor: `${school.color}20` }}>
                  <Icon size={28} style={{ color: school.color }} />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg group-hover:text-brand-300 transition-colors">{school.name}</h2>
                </div>
              </div>
              <p className="text-white/50 text-sm leading-relaxed mb-4">{school.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-brand-400 text-sm font-medium group-hover:gap-2 transition-all">Explore School →</span>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: school.color }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
