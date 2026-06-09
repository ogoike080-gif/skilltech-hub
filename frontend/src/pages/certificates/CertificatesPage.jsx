import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award, Download, ExternalLink } from 'lucide-react';
import api from '../../utils/api';

export default function CertificatesPage() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/certificates/my').then(r => setCerts(r.data.data || [])).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-2xl font-bold text-white">My Certificates</h1><p className="text-white/50 mt-1">Your earned certificates and credentials</p></div>
      {loading ? <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="card h-32 animate-pulse bg-white/5"/>)}</div>
      : certs.length===0 ? <div className="card text-center py-20"><Award size={48} className="text-white/10 mx-auto mb-4"/><p className="text-white/40">Complete courses to earn certificates</p><Link to="/courses" className="btn-primary mt-4 inline-block">Browse Courses</Link></div>
      : <div className="grid md:grid-cols-2 gap-4">{certs.map(cert=>(
        <div key={cert.id} className="card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full" style={{backgroundColor:cert.school_color}}/>
          <div className="flex items-start gap-4 pl-3">
            <div className="p-3 rounded-xl" style={{backgroundColor:`${cert.school_color}20`}}><Award size={24} style={{color:cert.school_color}}/></div>
            <div className="flex-1 min-w-0"><h3 className="font-semibold text-white truncate">{cert.course_title}</h3><p className="text-white/40 text-sm">{cert.school_name}</p><p className="text-white/30 text-xs mt-1">{new Date(cert.issued_at).toLocaleDateString()}</p></div>
            <div className="flex gap-1">
              {cert.pdf_url&&<a href={cert.pdf_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"><Download size={16}/></a>}
              <Link to={`/verify/${cert.verify_token}`} className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"><ExternalLink size={16}/></Link>
            </div>
          </div>
          <div className="mt-3 pl-3"><span className="text-white/20 text-xs font-mono">ID: {cert.verify_token?.slice(0,16)}...</span></div>
        </div>
      ))}</div>}
    </div>
  );
}
