// ============================================================
// pages/streaming/StreamStudioPage.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Radio, Youtube, Facebook, Instagram, Tv2, Linkedin, Plus, Trash2, Play, Square, BarChart2, Eye } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PLATFORM_ICONS = { youtube: Youtube, facebook: Facebook, instagram: Instagram, tiktok: Tv2, linkedin: Linkedin };
const PLATFORM_COLORS = { youtube: '#ef4444', facebook: '#3b82f6', instagram: '#ec4899', tiktok: '#000', linkedin: '#0077b5' };

export default function StreamStudioPage() {
  const { sessionId } = useParams();
  const [connections, setConnections] = useState([]);
  const [selected, setSelected]       = useState([]);
  const [streaming, setStreaming]      = useState(false);
  const [analytics, setAnalytics]     = useState(null);
  const [rtmpInfo, setRtmpInfo]        = useState(null);
  const [adding, setAdding]            = useState(false);
  const [newConn, setNewConn]          = useState({ platform: 'youtube', channelName: '', rtmpUrl: '', streamKey: '' });

  useEffect(() => {
    api.get('/streaming/connections').then(r => setConnections(r.data.data || [])).catch(() => {});
    api.get(`/streaming/${sessionId}/rtmp`).then(r => setRtmpInfo(r.data.data)).catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (!streaming) return;
    const interval = setInterval(() => {
      api.get(`/streaming/${sessionId}/analytics`).then(r => setAnalytics(r.data.data)).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [streaming, sessionId]);

  const addConnection = async () => {
    try {
      await api.post('/streaming/connections', newConn);
      toast.success('Platform connected');
      const r = await api.get('/streaming/connections');
      setConnections(r.data.data || []);
      setAdding(false);
      setNewConn({ platform: 'youtube', channelName: '', rtmpUrl: '', streamKey: '' });
    } catch { toast.error('Failed to connect platform'); }
  };

  const startStream = async () => {
    if (!selected.length) { toast.error('Select at least one platform'); return; }
    try {
      await api.post('/streaming/start', { sessionId, connectionIds: selected });
      setStreaming(true);
      toast.success(`🔴 Live on ${selected.length} platform(s)!`);
    } catch { toast.error('Failed to start stream'); }
  };

  const stopStream = async () => {
    try {
      await api.post(`/streaming/${sessionId}/stop`);
      setStreaming(false);
      toast.success('Stream ended');
    } catch { toast.error('Failed to stop stream'); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio size={22} className={streaming ? 'text-red-400 live-indicator' : 'text-brand-400'} />
            Stream Studio
          </h1>
          <p className="text-white/50 text-sm mt-1">Broadcast your class to multiple platforms simultaneously</p>
        </div>
        {streaming
          ? <button onClick={stopStream} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Square size={16} fill="white" /> Stop Stream
            </button>
          : <button onClick={startStream} disabled={!selected.length} className="btn-primary flex items-center gap-2">
              <Play size={16} fill="white" /> Go Live
            </button>
        }
      </div>

      {/* RTMP ingest info */}
      {rtmpInfo && (
        <div className="card">
          <h3 className="font-semibold text-white mb-3">OBS / Streaming Software Setup</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/40 text-xs mb-1 block">RTMP URL</label>
              <div className="flex gap-2">
                <input readOnly value={rtmpInfo.rtmpUrl} className="input text-xs font-mono flex-1" />
                <button onClick={() => { navigator.clipboard.writeText(rtmpInfo.rtmpUrl); toast.success('Copied!'); }} className="btn-secondary text-xs px-3">Copy</button>
              </div>
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block">Stream Key</label>
              <div className="flex gap-2">
                <input readOnly type="password" value={rtmpInfo.streamKey} className="input text-xs font-mono flex-1" />
                <button onClick={() => { navigator.clipboard.writeText(rtmpInfo.streamKey); toast.success('Copied!'); }} className="btn-secondary text-xs px-3">Copy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live analytics */}
      {streaming && analytics && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><BarChart2 size={16} className="text-brand-400" /> Live Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold gradient-text">{analytics.totalViewers}</div>
              <div className="text-white/40 text-xs">Total Viewers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">{analytics.platforms?.filter(p => p.status === 'active').length}</div>
              <div className="text-white/40 text-xs">Active Platforms</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-400">{analytics.sessionDuration}m</div>
              <div className="text-white/40 text-xs">Duration</div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {analytics.platforms?.map(p => {
              const Icon = PLATFORM_ICONS[p.platform] || Radio;
              return (
                <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <Icon size={18} style={{ color: PLATFORM_COLORS[p.platform] || '#6366f1' }} />
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{p.platform}</p>
                    <p className="text-white/40 text-xs flex items-center gap-1"><Eye size={10} /> {p.liveViewers || 0} watching</p>
                  </div>
                  <div className={`ml-auto w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Platform connections */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Connected Platforms</h3>
          <button onClick={() => setAdding(true)} className="btn-ghost text-sm flex items-center gap-1"><Plus size={14} /> Add Platform</button>
        </div>

        {adding && (
          <div className="bg-surface-100 rounded-xl p-4 mb-4 space-y-3">
            <select value={newConn.platform} onChange={e => setNewConn({ ...newConn, platform: e.target.value })} className="input text-sm">
              {Object.keys(PLATFORM_ICONS).map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              <option value="custom">Custom RTMP</option>
            </select>
            <input value={newConn.channelName} onChange={e => setNewConn({ ...newConn, channelName: e.target.value })}
              className="input text-sm" placeholder="Channel / Page name" />
            {newConn.platform === 'custom' && (
              <input value={newConn.rtmpUrl} onChange={e => setNewConn({ ...newConn, rtmpUrl: e.target.value })}
                className="input text-sm font-mono" placeholder="rtmp://..." />
            )}
            <input value={newConn.streamKey} onChange={e => setNewConn({ ...newConn, streamKey: e.target.value })}
              className="input text-sm font-mono" placeholder="Stream key" />
            <div className="flex gap-2">
              <button onClick={addConnection} className="btn-primary flex-1 text-sm">Connect</button>
              <button onClick={() => setAdding(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {connections.length === 0 && !adding
          ? <p className="text-white/30 text-sm text-center py-6">No platforms connected yet. Add one to start multistreaming.</p>
          : <div className="space-y-3">
              {connections.map(conn => {
                const Icon = PLATFORM_ICONS[conn.platform] || Radio;
                const isSelected = selected.includes(conn.id);
                return (
                  <div key={conn.id} onClick={() => setSelected(prev => isSelected ? prev.filter(id => id !== conn.id) : [...prev, conn.id])}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <Icon size={20} style={{ color: PLATFORM_COLORS[conn.platform] || '#6366f1' }} />
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm capitalize">{conn.platform}</p>
                      <p className="text-white/40 text-xs">{conn.channel_name}</p>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${conn.is_active ? 'bg-green-400' : 'bg-white/20'}`} />
                    {isSelected && <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs">✓</div>}
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}
