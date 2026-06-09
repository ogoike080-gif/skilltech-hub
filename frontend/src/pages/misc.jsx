// ============================================================
// pages/live/LivePage.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Video, Clock, Users, Calendar, ChevronRight, Plus } from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectUser, selectIsAuth } from '../../store';
import api from '../../utils/api';

export default function LivePage() {
  const [sessions, setSessions] = useState({ scheduled: [], live: [] });
  const [loading, setLoading]   = useState(true);
  const user   = useSelector(selectUser);
  const isAuth = useSelector(selectIsAuth);

  useEffect(() => {
    Promise.all([
      api.get('/live?status=scheduled&limit=20'),
      api.get('/live?status=live&limit=10'),
    ]).then(([sched, live]) => {
      setSessions({ scheduled: sched.data.data || [], live: live.data.data || [] });
    }).finally(() => setLoading(false));
  }, []);

  const SessionCard = ({ session, isLive }) => (
    <div className={`card-hover ${isLive ? 'border-red-500/30' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${isLive ? 'bg-red-500/10' : 'bg-brand-500/10'}`}>
          <Video size={18} className={isLive ? 'text-red-400' : 'text-brand-400'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isLive && <span className="flex items-center gap-1 badge bg-red-500/20 text-red-400 text-xs"><div className="w-1.5 h-1.5 bg-red-500 rounded-full live-indicator" />LIVE</span>}
            {session.course_title && <span className="badge bg-white/5 text-white/40 text-xs">{session.course_title}</span>}
          </div>
          <h3 className="font-semibold text-white truncate">{session.title}</h3>
          <div className="flex items-center gap-3 text-white/40 text-xs mt-1.5">
            <span className="flex items-center gap-1"><img src={session.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${session.first_name}`} alt="" className="w-4 h-4 rounded-full" />{session.first_name} {session.last_name}</span>
            {!isLive && <span className="flex items-center gap-1"><Calendar size={11} />{new Date(session.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>}
            {!isLive && <span className="flex items-center gap-1"><Clock size={11} />{session.duration_min}m</span>}
            {isLive && <span className="flex items-center gap-1"><Users size={11} />{session.current_participants} watching</span>}
          </div>
        </div>
        {isAuth && (
          <Link to={`/classroom/${session.id}`} className={`btn-primary text-xs px-4 py-2 flex-shrink-0 ${isLive ? '' : 'btn-secondary'}`}>
            {isLive ? 'Join Now' : 'View'}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-24 min-h-screen">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="section-title">Live Classes</h1>
          <p className="text-white/50 mt-2">Join expert-led live sessions and interact in real time</p>
        </div>
        {(user?.role === 'instructor' || user?.role === 'admin') && (
          <Link to="/instructor" className="btn-primary flex items-center gap-2 text-sm"><Plus size={16} /> Schedule Class</Link>
        )}
      </div>

      {sessions.live.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full live-indicator" /> Happening Now
          </h2>
          <div className="space-y-3">
            {sessions.live.map(s => <SessionCard key={s.id} session={s} isLive />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Upcoming Classes</h2>
        {loading
          ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-white/5" />)}</div>
          : sessions.scheduled.length === 0
            ? <div className="card text-center py-16"><Calendar size={40} className="text-white/10 mx-auto mb-3" /><p className="text-white/40">No upcoming classes scheduled</p></div>
            : <div className="space-y-3">{sessions.scheduled.map(s => <SessionCard key={s.id} session={s} />)}</div>
        }
      </div>
    </div>
  );
}

// ============================================================
// pages/certificates/CertificatesPage.jsx
// ============================================================
import { Award, Download, Share2, ExternalLink } from 'lucide-react';

export function CertificatesPage() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/certificates/my').then(r => setCerts(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">My Certificates</h1>
        <p className="text-white/50 mt-1">Your earned certificates and credentials</p>
      </div>

      {loading
        ? <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-white/5" />)}</div>
        : certs.length === 0
          ? <div className="card text-center py-20"><Award size={48} className="text-white/10 mx-auto mb-4" /><p className="text-white/40">Complete courses to earn certificates</p><Link to="/courses" className="btn-primary mt-4 inline-block">Browse Courses</Link></div>
          : <div className="grid md:grid-cols-2 gap-4">
              {certs.map(cert => (
                <div key={cert.id} className="card relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: cert.school_color }} />
                  <div className="flex items-start gap-4 pl-3">
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${cert.school_color}20` }}>
                      <Award size={24} style={{ color: cert.school_color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{cert.course_title}</h3>
                      <p className="text-white/40 text-sm">{cert.school_name}</p>
                      <p className="text-white/30 text-xs mt-1">{new Date(cert.issued_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1">
                      {cert.pdf_url && (
                        <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors" title="Download PDF">
                          <Download size={16} />
                        </a>
                      )}
                      <Link to={`/verify/${cert.verify_token}`}
                        className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors" title="Verify">
                        <ExternalLink size={16} />
                      </Link>
                    </div>
                  </div>
                  <div className="mt-3 pl-3">
                    <span className="text-white/20 text-xs font-mono">ID: {cert.verify_token?.slice(0, 16)}...</span>
                  </div>
                </div>
              ))}
            </div>
      }
    </div>
  );
}
export default CertificatesPage;

// ============================================================
// pages/certificates/VerifyPage.jsx
// ============================================================
export function VerifyPage() {
  const { token } = useParams ? useParams() : { token: '' };
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api.get(`/certificates/verify/${token}`).then(r => setResult(r.data)).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24">
      <div className="max-w-lg w-full">
        <div className={`card text-center ${result?.valid ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${result?.valid ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
            <Award size={40} className={result?.valid ? 'text-green-400' : 'text-red-400'} />
          </div>
          {result?.valid ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Certificate Verified ✓</h1>
              <p className="text-white/50 mb-6">This certificate is authentic and valid</p>
              <div className="bg-surface-100 rounded-xl p-5 text-left space-y-3">
                {[
                  { label: 'Recipient',   value: result.data?.recipientName },
                  { label: 'Course',      value: result.data?.courseTitle },
                  { label: 'School',      value: result.data?.schoolName },
                  { label: 'Instructor',  value: result.data?.instructorName },
                  { label: 'Issued',      value: new Date(result.data?.issuedAt).toLocaleDateString() },
                ].map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-white/40 text-sm">{item.label}</span>
                    <span className="text-white text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">Certificate Not Found</h1>
              <p className="text-white/50">This certificate could not be verified. It may be invalid or revoked.</p>
            </>
          )}
          <Link to="/" className="btn-primary mt-6 inline-block">Back to SkillTech Hub</Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// pages/NotFoundPage.jsx
// ============================================================
export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <div className="text-9xl font-black gradient-text mb-4">404</div>
        <h1 className="text-3xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-white/50 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary">Back to Home</Link>
      </div>
    </div>
  );
}
export { NotFoundPage as default };
