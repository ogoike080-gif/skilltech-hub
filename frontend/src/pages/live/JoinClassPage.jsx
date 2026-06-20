// frontend/src/pages/live/JoinClassPage.jsx
// Route: /join — students enter the meeting code + passcode here.
// They can NEVER start a class, only join one already live.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Lock, ArrowRight, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function JoinClassPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const lookupCode = async () => {
    const clean = code.replace(/\s/g, '');
    if (clean.length < 6) return;
    try {
      const { data } = await api.get(`/live/lookup/${clean}`);
      setPreview(data.data);
    } catch {
      setPreview(null);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code || !passcode) {
      toast.error('Enter both the meeting code and passcode');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/live/join', {
        meetingCode: code.replace(/\s/g, ''),
        passcode,
      });
      // data.data.session.id is the live session — route into the classroom
      navigate(`/classroom/${preview?.id || data.data.session.id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not join class';
      toast.error(msg);
      if (err.response?.status === 425) {
        toast('The host hasn\'t started this class yet. Try again shortly.', { icon: '⏳' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-grid-pattern">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Radio size={28} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join a Live Class</h1>
          <p className="text-white/50 mt-1 text-sm">Enter the meeting code your instructor shared with you</p>
        </div>

        <form onSubmit={handleJoin} className="card space-y-4">
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Meeting Code</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              onBlur={lookupCode}
              className="input text-center text-lg font-mono tracking-wider"
              placeholder="123 456 789"
              maxLength={11}
            />
          </div>

          {preview && (
            <div className="bg-surface-100 rounded-xl p-3 flex items-center gap-3">
              <img src={preview.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${preview.first_name}`}
                alt="" className="w-9 h-9 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{preview.title}</p>
                <p className="text-white/40 text-xs">{preview.first_name} {preview.last_name}</p>
              </div>
              {preview.status === 'live' ? (
                <span className="flex items-center gap-1 badge bg-red-500/20 text-red-400 text-xs flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> LIVE
                </span>
              ) : (
                <span className="flex items-center gap-1 badge bg-white/5 text-white/40 text-xs flex-shrink-0">
                  <Clock size={10} /> Not started
                </span>
              )}
            </div>
          )}

          <div>
            <label className="text-white/60 text-sm mb-1.5 block flex items-center gap-1.5">
              <Lock size={13} /> Passcode
            </label>
            <input
              value={passcode}
              onChange={e => setPasscode(e.target.value.toUpperCase())}
              className="input text-center font-mono tracking-wider"
              placeholder="ABC123"
              maxLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Join Class <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-white/30 text-xs text-center mt-6">
          Don't have a code? Check <a href="/live" className="text-brand-400 hover:underline">Live Classes</a> for public sessions you can join directly.
        </p>
      </div>
    </div>
  );
}
