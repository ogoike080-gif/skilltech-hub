// ADD this as a new tab/component inside frontend/src/pages/admin/AdminPage.jsx
// Import it and add { id: 'live', icon: Radio, label: 'Live Monitoring' } to your TABS array,
// then render <LiveMonitoringTab /> when activeTab === 'live'.

import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Users, XCircle, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

function ForceEndModal({ session, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    await onConfirm(session.id, reason);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-50 border border-red-500/30 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-red-400" />
          <h2 className="text-lg font-bold text-white">Force-End This Class?</h2>
        </div>
        <p className="text-white/60 text-sm mb-4">
          "{session.title}" hosted by {session.first_name} {session.last_name} will be ended immediately for all participants.
        </p>
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          className="input resize-none mb-4" rows={3}
          placeholder="Reason (sent to the instructor)..." />
        <div className="flex gap-3">
          <button onClick={submit} disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <XCircle size={16} />}
            Force-End
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function LiveMonitoringTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);

  const fetchSessions = useCallback(() => {
    setLoading(true);
    api.get('/admin/live-sessions').then(r => setSessions(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000); // auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const forceEnd = async (id, reason) => {
    try {
      await api.post(`/admin/live-sessions/${id}/force-end`, { reason });
      toast.success('Session force-ended');
      setTarget(null);
      fetchSessions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end session');
    }
  };

  const liveSessions = sessions.filter(s => s.status === 'live');
  const scheduledSessions = sessions.filter(s => s.status === 'scheduled');

  return (
    <div className="space-y-6">
      {target && <ForceEndModal session={target} onClose={() => setTarget(null)} onConfirm={forceEnd} />}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Radio size={18} className="text-red-400" /> Live Monitoring
        </h2>
        <button onClick={fetchSessions} className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Currently live */}
      <div>
        <h3 className="text-white/60 text-sm font-medium mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live Now ({liveSessions.length})
        </h3>
        {liveSessions.length === 0 ? (
          <div className="card text-center py-8 text-white/30 text-sm">No classes currently live</div>
        ) : (
          <div className="space-y-3">
            {liveSessions.map(s => (
              <div key={s.id} className="card border-red-500/20 flex items-center gap-4">
                <div className="p-2.5 bg-red-500/10 rounded-xl flex-shrink-0">
                  <Radio size={18} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{s.title}</p>
                  <p className="text-white/40 text-xs">
                    {s.first_name} {s.last_name} · {s.email} · Code: {s.meeting_code}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-white/50 text-sm flex-shrink-0">
                  <Users size={14} /> {s.current_participants}/{s.max_participants}
                </div>
                <button onClick={() => setTarget(s)}
                  className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-semibold px-3 py-2 rounded-xl flex-shrink-0">
                  <XCircle size={13} /> Force-End
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled / upcoming */}
      <div>
        <h3 className="text-white/60 text-sm font-medium mb-3 flex items-center gap-2">
          <Clock size={14} /> Scheduled ({scheduledSessions.length})
        </h3>
        {scheduledSessions.length === 0 ? (
          <div className="card text-center py-8 text-white/30 text-sm">No upcoming classes</div>
        ) : (
          <div className="space-y-2">
            {scheduledSessions.map(s => (
              <div key={s.id} className="card flex items-center gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.title}</p>
                  <p className="text-white/40 text-xs">
                    {s.first_name} {s.last_name} · {new Date(s.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <span className="badge bg-white/5 text-white/40 text-xs flex-shrink-0">{s.meeting_code}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
