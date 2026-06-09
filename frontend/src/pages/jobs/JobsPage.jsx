import React, { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Search, ExternalLink } from 'lucide-react';
import api from '../../utils/api';

export default function JobsPage() {
  const [jobs, setJobs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType]     = useState('');

  useEffect(() => {
    setLoading(true);
    api.get('/jobs', { params: { search: search || undefined, type: type || undefined } })
      .then(r => setJobs(r.data.data || [])).finally(() => setLoading(false));
  }, [search, type]);

  const typeColor = { full_time:'bg-green-500/15 text-green-400', part_time:'bg-blue-500/15 text-blue-400', contract:'bg-yellow-500/15 text-yellow-400', internship:'bg-purple-500/15 text-purple-400', remote:'bg-teal-500/15 text-teal-400' };

  return (
    <div className="max-w-5xl mx-auto px-4 py-24 min-h-screen">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2">Job Board</h1>
        <p className="text-white/50">Tech opportunities from top companies</p>
      </div>
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search jobs..." />
        </div>
        <select value={type} onChange={e => setType(e.target.value)} className="input w-40">
          <option value="">All Types</option>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="contract">Contract</option>
          <option value="internship">Internship</option>
          <option value="remote">Remote</option>
        </select>
      </div>
      {loading ? (
        <div className="space-y-4">{[...Array(5)].map((_,i) => <div key={i} className="card h-28 animate-pulse bg-white/5"/>)}</div>
      ) : jobs.length === 0 ? (
        <div className="card text-center py-16"><Briefcase size={40} className="text-white/10 mx-auto mb-3"/><p className="text-white/40">No jobs found</p></div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job.id} className="card-hover flex items-start gap-4">
              {job.company_logo
                ? <img src={job.company_logo} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0"/>
                : <div className="w-12 h-12 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0 text-xl">{job.company_name[0]}</div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="font-bold text-white">{job.title}</h3>
                    <p className="text-white/50 text-sm">{job.company_name}</p>
                  </div>
                  <span className={`badge text-xs capitalize ${typeColor[job.type] || 'bg-white/5 text-white/40'}`}>{job.type?.replace('_',' ')}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-white/40 text-xs flex-wrap">
                  {job.location && <span className="flex items-center gap-1"><MapPin size={11}/>{job.location}</span>}
                  {(job.salary_min || job.salary_max) && (
                    <span className="flex items-center gap-1 text-green-400">
                      <DollarSign size={11}/>
                      {job.salary_min && job.salary_max ? `${job.salary_min.toLocaleString()}–${job.salary_max.toLocaleString()}` : (job.salary_min || job.salary_max)?.toLocaleString()} {job.currency}/yr
                    </span>
                  )}
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {job.apply_url && (
                <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 flex-shrink-0">
                  Apply <ExternalLink size={12}/>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
