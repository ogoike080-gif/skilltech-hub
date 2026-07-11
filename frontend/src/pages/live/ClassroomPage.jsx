import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Lock, Radio, Circle, Square, MessageCircle, X,
  Send, Users, BarChart2, Share2, Download, Facebook,
  Instagram, Music2, X as XIcon, Link2, ChevronDown
} from 'lucide-react';
import {
  LiveKitRoom, VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useSessionSocket } from '../../hooks';

// ── Constants ──────────────────────────────────────────────
const CLOUDINARY_CLOUD  = 'dhl0k5obr';
const CLOUDINARY_PRESET = 'skilltech_recordings';
const SITE_URL = 'https://skilltech-hub-frontend-production.up.railway.app';

// ── Share Menu ─────────────────────────────────────────────
function ShareMenu({ url, title, onClose }) {
  const encoded = encodeURIComponent(url);
  const text    = encodeURIComponent(`Check out this class recording: ${title}`);

  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
    onClose();
  };

  const targets = [
    { label: 'X (Twitter)', action: () => { window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encoded}`, '_blank'); onClose(); } },
    { label: 'Facebook',    action: () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, '_blank'); onClose(); } },
    {
      label: 'Instagram',
      action: () => {
        navigator.clipboard.writeText(url);
        toast('Link copied! Paste into your Instagram bio or story.', { icon: '📋', duration: 4000 });
        onClose();
      }
    },
    {
      label: 'TikTok',
      action: () => {
        navigator.clipboard.writeText(url);
        toast('Link copied! Paste into your TikTok bio.', { icon: '📋', duration: 4000 });
        onClose();
      }
    },
  ];

  return (
    <div className="absolute right-0 bottom-full mb-2 w-48 bg-surface-50 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
      {targets.map(t => (
        <button key={t.label} onClick={t.action}
          className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-white/5 text-white/70 hover:text-white text-sm">
          {t.label}
        </button>
      ))}
      <div className="border-t border-white/10">
        <button onClick={copy}
          className="flex items-center gap-2 w-full px-4 py-2.5 hover:bg-white/5 text-white/70 hover:text-white text-sm">
          <Link2 size={13} /> Copy link
        </button>
      </div>
    </div>
  );
}

// ── Chat Panel (shared by desktop side panel + mobile overlay) ──
function ChatPanel({ sessionId, socket, currentUser, isInstructor, participants }) {
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [privateTo, setPrivateTo]   = useState(null); // { userId, name } for DM
  const [showParticipants, setShowParticipants] = useState(false);
  const bottomRef                   = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handler = (msg) => {
      // Show public messages, or private messages addressed to/from current user
      if (!msg.isPrivate) {
        setMessages(prev => [...prev, msg]);
      } else if (
        msg.recipientId === currentUser?.id ||
        msg.senderId === currentUser?.id
      ) {
        setMessages(prev => [...prev, { ...msg, isPrivate: true }]);
      }
    };

    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [socket, currentUser]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = () => {
    if (!input.trim()) return;
    socket?.emit('chat:message', {
      sessionId,
      message: input.trim(),
      isPrivate: !!privateTo,
      recipientId: privateTo?.userId || null,
    });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Private mode banner */}
      {privateTo && (
        <div className="flex items-center justify-between px-3 py-2 bg-brand-500/20 border-b border-brand-500/30 flex-shrink-0">
          <span className="text-brand-300 text-xs font-medium">
            🔒 Private to {privateTo.name}
          </span>
          <button onClick={() => setPrivateTo(null)} className="text-white/40 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-white/30 text-sm text-center mt-8">Chat is quiet... say hello!</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.isPrivate ? 'opacity-90' : ''}`}>
            <img
              src={msg.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${msg.senderName}`}
              alt="" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-brand-300 text-xs font-medium">{msg.senderName}</span>
                {msg.isPrivate && (
                  <span className="text-white/30 text-xs">🔒 private</span>
                )}
                {/* DM button — tap a message sender name to DM them */}
                {msg.senderId !== currentUser?.id && (
                  <button
                    onClick={() => setPrivateTo({ userId: msg.senderId, name: msg.senderName })}
                    className="text-white/20 hover:text-brand-400 text-xs transition-colors"
                    title={`Message ${msg.senderName} privately`}>
                    DM
                  </button>
                )}
              </div>
              <p className={`text-sm break-words ${msg.isPrivate ? 'text-brand-200/80' : 'text-white/80'}`}>
                {msg.message}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMsg()}
            className="input text-sm py-2 flex-1 min-w-0 bg-white text-gray-900 placeholder-gray-400"
            placeholder={privateTo ? `Message ${privateTo.name}...` : 'Send a message...'} />
          <button onClick={sendMsg} className="btn-primary px-3 py-2 text-sm flex-shrink-0">
            <Send size={14} />
          </button>
        </div>
        {isInstructor && (
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="text-white/30 hover:text-white/60 text-xs mt-1.5 flex items-center gap-1">
            <Users size={11} /> Message a student privately
          </button>
        )}
        {showParticipants && participants.length > 0 && (
          <div className="mt-2 bg-surface-100 rounded-lg p-2 space-y-1 max-h-32 overflow-y-auto">
            {participants.map(p => (
              <button key={p.userId} onClick={() => { setPrivateTo(p); setShowParticipants(false); }}
                className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-white/5 rounded text-sm text-white/70">
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Poll Panel ─────────────────────────────────────────────
function PollPanel({ sessionId, socket, isInstructor }) {
  const [polls, setPolls]       = useState([]);
  const [question, setQuestion] = useState('');
  const [options, setOptions]   = useState(['', '']);

  useEffect(() => {
    if (!socket) return;
    socket.on('classroom:poll:new',   (poll) => setPolls(prev => [poll, ...prev]));
    socket.on('classroom:poll:voted', ({ pollId, userId, optionIndex }) => {
      setPolls(prev => prev.map(p =>
        p.id === pollId ? { ...p, votes: { ...p.votes, [userId]: optionIndex } } : p
      ));
    });
    return () => { socket.off('classroom:poll:new'); socket.off('classroom:poll:voted'); };
  }, [socket]);

  const createPoll = () => {
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) {
      toast.error('Need a question and at least 2 options');
      return;
    }
    socket?.emit('classroom:poll:create', { sessionId, question: question.trim(), options: validOpts });
    setQuestion(''); setOptions(['', '']);
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto">
      {isInstructor && (
        <div className="card p-3 space-y-2">
          <input value={question} onChange={e => setQuestion(e.target.value)}
            className="input text-sm py-2" placeholder="Poll question..." />
          {options.map((opt, i) => (
            <input key={i} value={opt} onChange={e => {
              const o = [...options]; o[i] = e.target.value; setOptions(o);
            }} className="input text-sm py-2" placeholder={`Option ${i + 1}`} />
          ))}
          <div className="flex gap-2">
            <button onClick={() => setOptions([...options, ''])}
              className="btn-ghost text-xs px-2 py-1">+ Add option</button>
            <button onClick={createPoll}
              className="btn-primary text-xs px-3 py-1 ml-auto">Launch Poll</button>
          </div>
        </div>
      )}
      {polls.map(poll => (
        <div key={poll.id} className="card p-3">
          <p className="text-white font-medium text-sm mb-2">{poll.question}</p>
          {poll.options.map((opt, i) => {
            const voteCount = Object.values(poll.votes || {}).filter(v => v === i).length;
            const total = Object.keys(poll.votes || {}).length;
            const pct = total ? Math.round((voteCount / total) * 100) : 0;
            return (
              <button key={i}
                onClick={() => socket?.emit('classroom:poll:vote', { sessionId, pollId: poll.id, optionIndex: i })}
                className="w-full text-left mb-1 p-2 rounded-lg hover:bg-white/5 border border-white/10 text-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-500/20" style={{ width: `${pct}%` }} />
                <span className="relative">{opt} <span className="text-white/40 text-xs">{pct}%</span></span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Browser Recorder ───────────────────────────────────────
function BrowserRecorder({ sessionId, sessionTitle, isInstructor, onRecordingSaved }) {
  const [recording, setRecording]   = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [duration, setDuration]     = useState(0);
  const mediaRecorderRef            = useRef(null);
  const chunksRef                   = useRef([]);
  const timerRef                    = useRef(null);
  const streamRef                   = useRef(null);

  useEffect(() => { return () => { stopStream(); clearInterval(timerRef.current); }; }, []);

  const stopStream = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const fmt = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const startRecording = async () => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const supportsDisplay = typeof navigator.mediaDevices?.getDisplayMedia === 'function';
      let stream;

      if (!isMobile && supportsDisplay) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: 30, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true,
        });
        let micStream = null;
        try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); } catch {}
        const tracks = [...screenStream.getVideoTracks()];
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();
        if (screenStream.getAudioTracks().length) ctx.createMediaStreamSource(screenStream).connect(dest);
        if (micStream?.getAudioTracks().length) ctx.createMediaStreamSource(micStream).connect(dest);
        stream = new MediaStream([...tracks, ...dest.stream.getTracks()]);
        screenStream.getVideoTracks()[0].onended = () => { if (mediaRecorderRef.current?.state === 'recording') stopRecording(); };
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        toast('Recording camera on mobile 📱', { duration: 3000 });
      }

      streamRef.current = stream;
      const mimeType = ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => handleStopped(mimeType);
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      setRecording(true);
      toast.success('Recording started 🔴');
    } catch (err) {
      if (err.name === 'NotAllowedError') toast.error('Permission denied. Allow camera/mic access.');
      else toast.error('Could not start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    stopStream();
    setRecording(false);
  };

  const handleStopped = async (mimeType) => {
    if (!chunksRef.current.length) { toast.error('No recording data'); return; }
    setUploading(true); setProgress(0);
    try {
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];

      const fd = new FormData();
      fd.append('file', blob, `recording-${sessionId}.${ext}`);
      fd.append('upload_preset', CLOUDINARY_PRESET);
      fd.append('folder', 'sessions');
      fd.append('resource_type', 'video');

      const recordingUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(e.loaded*100/e.total)); };
        xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText).secure_url) : reject(new Error(`Cloudinary ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`);
        xhr.send(fd);
      });

      await api.post(`/live/${sessionId}/save-recording`, {
        recordingUrl,
        sessionTitle: sessionTitle || 'Live Class Recording',
      });

      toast.success('Recording saved! 🎉');
      onRecordingSaved?.(recordingUrl);
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally { setUploading(false); setProgress(0); }
  };

  if (!isInstructor) return null;

  if (uploading) return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/20 rounded-lg">
      <div className="w-3 h-3 border border-brand-400/40 border-t-brand-400 rounded-full animate-spin" />
      <span className="text-brand-300 text-xs">{progress < 100 ? `Uploading ${progress}%` : 'Processing...'}</span>
    </div>
  );

  if (recording) return (
    <button onClick={stopRecording}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold">
      <Square size={12} fill="white" /><span className="font-mono">{fmt(duration)}</span>
    </button>
  );

  return (
    <button onClick={startRecording}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold"
      title="Record screen + audio">
      <Circle size={12} className="text-red-400" /> Record
    </button>
  );
}

// ── Recording Share/Download Bar ───────────────────────────
function RecordingActions({ recordingUrl, sessionTitle }) {
  const [shareOpen, setShareOpen] = useState(false);
  if (!recordingUrl) return null;

  const download = () => {
    const a = document.createElement('a');
    a.href = recordingUrl;
    a.download = `${sessionTitle || 'recording'}.mp4`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex items-center gap-2 relative">
      <button onClick={download}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold">
        <Download size={12} /> Download
      </button>
      <div className="relative">
        <button onClick={() => setShareOpen(!shareOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold">
          <Share2 size={12} /> Share
        </button>
        {shareOpen && (
          <ShareMenu
            url={recordingUrl}
            title={sessionTitle}
            onClose={() => setShareOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

// ── Main Classroom Page ────────────────────────────────────
export default function ClassroomPage() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const [tokenData, setTokenData]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activePanel, setActivePanel] = useState('chat');
  const [participants, setParticipants] = useState([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState(null);

  // Mobile chat overlay
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Code gate state
  const [needsCodeGate, setNeedsCodeGate] = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [gateCode, setGateCode]     = useState('');
  const [gatePasscode, setGatePasscode] = useState('');

  const { emit, socket } = useSessionSocket(sessionId, {
    onParticipantJoined: (data) => {
      setParticipantCount(data.count || 0);
      if (data.userId && data.name) {
        setParticipants(prev => {
          if (prev.find(p => p.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, name: data.name }];
        });
      }
      toast(`${data.name} joined`, { icon: '👋', duration: 2000 });
    },
    onParticipantLeft: (data) => {
      setParticipantCount(data.count || 0);
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    },
    onHandRaised: (data) => {
      toast(`✋ ${data.name} raised their hand`, { duration: 3000 });
    },
  });

  // Add/remove body class to prevent scroll behind classroom
  useEffect(() => {
    document.body.classList.add('classroom-active');
    return () => document.body.classList.remove('classroom-active');
  }, []);

  useEffect(() => {
    api.get(`/live/${sessionId}/token`).then(r => {
      setTokenData(r.data.data);
    }).catch(err => {
      const status = err.response?.status;
      const msg = err.response?.data?.message || '';
      if (status === 403 && msg.includes('meeting code')) {
        setNeedsCodeGate(true);
      } else {
        toast.error(msg || 'Failed to join session');
        navigate('/live');
      }
    }).finally(() => setLoading(false));
  }, [sessionId]);

  const verifyAndJoin = async (e) => {
    e.preventDefault();
    if (!gateCode.trim() || !gatePasscode.trim()) { toast.error('Enter both code and passcode'); return; }
    setVerifying(true);
    try {
      const { data } = await api.post(`/live/${sessionId}/verify-code`, {
        meetingCode: gateCode.replace(/\s/g, ''), passcode: gatePasscode,
      });
      const tokenRes = await api.get(`/live/${sessionId}/token?grant=${encodeURIComponent(data.data.grant)}`);
      setTokenData(tokenRes.data.data);
      setNeedsCodeGate(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not verify code');
    } finally { setVerifying(false); }
  };

  const sendReaction = (emoji) => {
    emit('reaction', { sessionId, emoji });
    toast(emoji, { duration: 1500, position: 'top-center' });
  };

  if (loading) return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (needsCodeGate) return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Radio size={28} className="text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Enter Class Details</h1>
          <p className="text-white/50 mt-1 text-sm">Enter the meeting code and passcode to join.</p>
        </div>
        <form onSubmit={verifyAndJoin} className="card space-y-4">
          <div>
            <label className="text-white/60 text-sm mb-1.5 block">Meeting Code</label>
            <input value={gateCode} onChange={e => setGateCode(e.target.value)}
              className="input text-center text-lg font-mono tracking-wider" placeholder="123 456 789" maxLength={11} />
          </div>
          <div>
            <label className="text-white/60 text-sm mb-1.5 flex items-center gap-1.5 block">
              <Lock size={13} /> Passcode
            </label>
            <input value={gatePasscode} onChange={e => setGatePasscode(e.target.value.toUpperCase())}
              className="input text-center font-mono tracking-wider" placeholder="ABC123" maxLength={6} />
          </div>
          <button type="submit" disabled={verifying}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {verifying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Join Class'}
          </button>
        </form>
      </div>
    </div>
  );

  if (!tokenData) return null;

  const isInstructor = tokenData.session?.isInstructor;
  const currentUser  = { id: tokenData.userId };

  const chatPanel = (
    <ChatPanel
      sessionId={sessionId}
      socket={socket}
      currentUser={currentUser}
      isInstructor={isInstructor}
      participants={participants}
    />
  );

  return (
    <div className="fixed inset-0 bg-[#0a0a12] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-surface/80 backdrop-blur-sm flex-shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-white font-semibold text-sm truncate">
            {tokenData.session?.title || 'Live Class'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          <BrowserRecorder
            sessionId={sessionId}
            sessionTitle={tokenData.session?.title}
            isInstructor={isInstructor}
            onRecordingSaved={setRecordingUrl}
          />
          {recordingUrl && isInstructor && (
            <RecordingActions
              recordingUrl={recordingUrl}
              sessionTitle={tokenData.session?.title}
            />
          )}
          <span className="text-white/50 text-xs">👥 {participantCount}</span>
          <button onClick={() => navigate(-1)}
            className="text-white/50 hover:text-red-400 text-xs px-2 py-1 rounded">✕</button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <LiveKitRoom
            token={tokenData.token}
            serverUrl={tokenData.serverUrl}
            connect={true}
            video={false}
            audio={false}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>

          {/* Reactions bar */}
          <div className="flex items-center justify-center gap-2 py-2 border-t border-white/10 bg-surface/80 flex-shrink-0 sticky bottom-0 z-10 overflow-x-auto">
            {['✋', '👍', '❤️', '😂', '🔥', '👏', '🎉'].map(emoji => (
              <button key={emoji} onClick={() => sendReaction(emoji)}
                className="text-xl hover:scale-125 transition-transform active:scale-95 flex-shrink-0">
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop side panel */}
        <div className="w-72 border-l border-white/10 flex-col bg-surface/50 hidden md:flex flex-shrink-0">
          <div className="flex border-b border-white/10 flex-shrink-0">
            {['chat', 'polls'].map(panel => (
              <button key={panel} onClick={() => setActivePanel(panel)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                  activePanel === panel ? 'text-brand-400 border-b-2 border-brand-400' : 'text-white/40 hover:text-white'
                }`}>
                {panel.charAt(0).toUpperCase() + panel.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {activePanel === 'chat'  && chatPanel}
            {activePanel === 'polls' && <PollPanel sessionId={sessionId} socket={socket} isInstructor={isInstructor} />}
          </div>
        </div>
      </div>

      {/* Mobile chat button */}
      <button
        onClick={() => setMobileChatOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform">
        <MessageCircle size={20} className="text-white" />
      </button>

      {/* Mobile chat overlay */}
      {mobileChatOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col">
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={() => setMobileChatOpen(false)} />

          {/* Chat sheet — slides up from bottom */}
          <div className="bg-surface-50 border-t border-white/10 flex flex-col" style={{ height: '70vh' }}>
            {/* Handle + header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <div className="flex gap-4">
                {['chat', 'polls'].map(panel => (
                  <button key={panel} onClick={() => setActivePanel(panel)}
                    className={`text-sm font-medium capitalize ${activePanel === panel ? 'text-brand-400' : 'text-white/40'}`}>
                    {panel.charAt(0).toUpperCase() + panel.slice(1)}
                  </button>
                ))}
              </div>
              <button onClick={() => setMobileChatOpen(false)} className="text-white/40 hover:text-white">
                <ChevronDown size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {activePanel === 'chat'  && chatPanel}
              {activePanel === 'polls' && <PollPanel sessionId={sessionId} socket={socket} isInstructor={isInstructor} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
