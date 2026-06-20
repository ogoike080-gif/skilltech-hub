// frontend/src/components/live/HostClassCard.jsx
// Shown to the INSTRUCTOR after scheduling a class — displays the
// shareable meeting code + passcode, Zoom-style.

import React, { useState } from 'react';
import { Copy, Check, Radio, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function HostClassCard({ session, onStarted }) {
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  const formattedCode = session.meeting_code?.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

  const copyDetails = () => {
    const text = `Join my live class on SkillTech Hub!\n\nMeeting Code: ${formattedCode}\nPasscode: ${session.passcode}\n\nGo to skilltech-hub-frontend-production.up.railway.app/join and enter these details.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Class details copied — share with your students!');
    setTimeout(() => setCopied(false), 2000);
  };

  const startClass = async () => {
    setStarting(true);
    try {
      await api.post(`/live/${session.id}/start`);
      toast.success("You're live! 🔴");
      onStarted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start class');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="card border-brand-500/30">
      <div className="flex items-center gap-2 mb-4">
        <Radio size={18} className="text-brand-400" />
        <h3 className="font-semibold text-white">{session.title}</h3>
      </div>

      <div className="bg-surface-100 rounded-xl p-4 mb-4 text-center">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Meeting Code</p>
        <p className="text-2xl font-mono font-bold text-white tracking-wider">{formattedCode}</p>
        <div className="flex items-center justify-center gap-2 mt-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Passcode:</p>
          <p className="font-mono font-bold text-brand-300">{session.passcode}</p>
        </div>
      </div>

      <button onClick={copyDetails} className="btn-secondary w-full flex items-center justify-center gap-2 mb-3 text-sm">
        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        {copied ? 'Copied!' : 'Copy & Share With Students'}
      </button>

      <button onClick={startClass} disabled={starting || session.status === 'live'}
        className="btn-primary w-full flex items-center justify-center gap-2">
        {session.status === 'live' ? (
          <><div className="w-2 h-2 bg-white rounded-full animate-pulse" /> Live Now</>
        ) : starting ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting...</>
        ) : (
          <><Play size={16} fill="white" /> Start Class</>
        )}
      </button>

      <p className="text-white/30 text-xs text-center mt-3">
        Only you can start this class. Students join with the code above once you've started.
      </p>
    </div>
  );
}
