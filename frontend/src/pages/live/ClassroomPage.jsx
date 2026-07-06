import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Radio, Mic, MicOff, Video, VideoOff, Circle, Square } from 'lucide-react';
import {
  LiveKitRoom, VideoConference, ControlBar,
  RoomAudioRenderer,
} from '@livekit/components-react';
  

import '@livekit/components-styles';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useSessionSocket } from '../../hooks';



// ── Chat Panel ────────────────────────────────────────────
function ChatPanel({ sessionId, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const bottomRef               = useRef(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => setMessages(prev => [...prev, msg]);
    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = () => {
    if (!input.trim()) return;
    socket?.emit('chat:message', { sessionId, message: input.trim() });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-white/30 text-sm text-center mt-8">Chat is quiet... say hello!</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="flex gap-2">
            <img src={msg.avatarUrl || `https://api.dicebear.com/8.x/initials/svg?seed=${msg.senderName}`}
              alt="" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-brand-300 text-xs font-medium">{msg.senderName} </span>
              <span className="text-white/80 text-sm">{msg.message}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-white/10 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMsg()}
          className="input text-sm py-2 flex-1" placeholder="Send a message..." />
        <button onClick={sendMsg}
          className="btn-primary px-3 py-2 text-sm">➤</button>
      </div>
    </div>
  );
}

// ── Poll Panel ────────────────────────────────────────────
function PollPanel({ sessionId, socket, isInstructor }) {
  const [polls, setPolls]       = useState([]);
  const [question, setQuestion] = useState('');
  const [options, setOptions]   = useState(['', '']);

  useEffect(() => {
    if (!socket) return;
    socket.on('classroom:poll:new',   (poll) => setPolls(prev => [poll, ...prev]));
    socket.on('classroom:poll:voted', ({ pollId, userId, optionIndex }) => {
      setPolls(prev => prev.map(p =>
        p.id === pollId
          ? { ...p, votes: { ...p.votes, [userId]: optionIndex } }
          : p
      ));
    });
    return () => { socket.off('classroom:poll:new'); socket.off('classroom:poll:voted'); };
  }, [socket]);

  const createPoll = () => {
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) {
      toast.error('Poll needs a question and at least 2 options');
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
                <div className="absolute inset-0 bg-brand-500/20 transition-all" style={{ width: `${pct}%` }} />
                <span className="relative">{opt} <span className="text-white/40 text-xs">{pct}%</span></span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Participant count helper ───────────────────────────────
//function ParticipantCount() {
 // const participants = useParticipants();
 // return <span>{participants.length}</span>;
//}

function BrowserRecorder({ sessionId, sessionTitle, isInstructor }) {
  const [recording, setRecording]   = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [progress, setProgress]     = useState(0);
  const [duration, setDuration]     = useState(0);
  const mediaRecorderRef            = useRef(null);
  const chunksRef                   = useRef([]);
  const timerRef                    = useRef(null);
  const streamRef                   = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopStream();
      clearInterval(timerRef.current);
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      // Request screen capture with system audio
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      // Also capture microphone audio and mix it in
      let micStream = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch {
        // Mic not available — screen audio only
      }

      // Combine screen video + screen audio + mic audio into one stream
      const tracks = [...screenStream.getVideoTracks()];
      const audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();

      if (screenStream.getAudioTracks().length > 0) {
        audioContext.createMediaStreamSource(screenStream).connect(dest);
      }
      if (micStream?.getAudioTracks().length > 0) {
        audioContext.createMediaStreamSource(micStream).connect(dest);
      }

      const combinedStream = new MediaStream([...tracks, ...dest.stream.getTracks()]);
      streamRef.current = combinedStream;

      // Pick the best supported format
      const mimeType = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000, // 2.5Mbps — good quality, reasonable size
      });

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        handleRecordingStopped(mimeType);
      };

      // Handle if user stops screen share via browser UI
      screenStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      };

      recorder.start(1000); // collect data every second
      mediaRecorderRef.current = recorder;

      // Start duration timer
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      setRecording(true);
      toast.success('Recording started 🔴');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        toast.error('Screen share permission denied');
      } else {
        toast.error('Could not start recording: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopStream();
    setRecording(false);
  };

  const handleRecordingStopped = async (mimeType) => {
    if (chunksRef.current.length === 0) {
      toast.error('No recording data captured');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];

      // Upload via backend endpoint which saves to Cloudinary
      const formData = new FormData();
      formData.append('recording', blob, `recording-${sessionId}.${extension}`);
      formData.append('sessionId', sessionId);
      formData.append('sessionTitle', sessionTitle || 'Live Class Recording');

      const res = await api.post(
        `/live/${sessionId}/upload-recording`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            setProgress(Math.round((e.loaded * 100) / e.total));
          },
          timeout: 30 * 60 * 1000, // 30 min timeout for large files
        }
      );

      toast.success('Recording uploaded and course created! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed — try again');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (!isInstructor) return null;

  if (uploading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-500/20 rounded-lg">
        <div className="w-3 h-3 border border-brand-400/40 border-t-brand-400 rounded-full animate-spin" />
        <span className="text-brand-300 text-xs font-medium">Uploading {progress}%</span>
      </div>
    );
  }

  if (recording) {
    return (
      <button onClick={stopRecording}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-all">
        <Square size={12} fill="white" />
        <span className="font-mono">{formatDuration(duration)}</span>
      </button>
    );
  }

  return (
    <button onClick={startRecording}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-semibold transition-all"
      title="Record screen + audio">
      <Circle size={12} className="text-red-400" />
      Record
    </button>
  );
}

// ── Main Classroom Page ───────────────────────────────────
export default function ClassroomPage() {
  const { sessionId }   = useParams();
  const navigate        = useNavigate();
  const [tokenData, setTokenData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activePanel, setActivePanel] = useState('chat');
  const [participants, setParticipants] = useState(0);

  // Code gate state
  const [needsCodeGate, setNeedsCodeGate] = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [gateCode, setGateCode]     = useState('');
  const [gatePasscode, setGatePasscode] = useState('');

  const { emit, socket } = useSessionSocket(sessionId, {
    onParticipantJoined: (data) => {
      setParticipants(data.count || 0);
      toast(`${data.name} joined`, { icon: '👋', duration: 2000 });
    },
    onParticipantLeft: (data) => {
      setParticipants(data.count || 0);
    },
    onHandRaised: (data) => {
      toast(`✋ ${data.name} raised their hand`, { duration: 3000 });
    },
  });

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
    if (!gateCode.trim() || !gatePasscode.trim()) {
      toast.error('Enter both the meeting code and passcode');
      return;
    }
    setVerifying(true);
    try {
      const { data } = await api.post(`/live/${sessionId}/verify-code`, {
        meetingCode: gateCode.replace(/\s/g, ''),
        passcode: gatePasscode,
      });
      const grant = data.data.grant;
      const tokenRes = await api.get(`/live/${sessionId}/token?grant=${encodeURIComponent(grant)}`);
      setTokenData(tokenRes.data.data);
      setNeedsCodeGate(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not verify code');
    } finally {
      setVerifying(false);
    }
  };

  const toggleHand = () => emit('hand:raise', { sessionId });

  const sendReaction = (emoji) => {
    emit('reaction', { sessionId, emoji });
    toast(emoji, { duration: 1500, position: 'top-center' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-surface flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsCodeGate) {
    return (
      <div className="fixed inset-0 bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Radio size={28} className="text-brand-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Enter Class Details</h1>
            <p className="text-white/50 mt-1 text-sm">
              Enter the meeting code and passcode your instructor shared with you to join this class.
            </p>
          </div>
          <form onSubmit={verifyAndJoin} className="card space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">Meeting Code</label>
              <input value={gateCode} onChange={e => setGateCode(e.target.value)}
                className="input text-center text-lg font-mono tracking-wider"
                placeholder="123 456 789" maxLength={11} />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block flex items-center gap-1.5">
                <Lock size={13} /> Passcode
              </label>
              <input value={gatePasscode} onChange={e => setGatePasscode(e.target.value.toUpperCase())}
                className="input text-center font-mono tracking-wider"
                placeholder="ABC123" maxLength={6} />
            </div>
            <button type="submit" disabled={verifying}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {verifying
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Join Class'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!tokenData) return null;

  return (
    <div className="fixed inset-0 bg-[#0a0a12] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-surface/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-semibold text-sm truncate max-w-[160px]">
            {tokenData.session?.title || 'Live Class'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Record button — instructor only */}
          <RecordButton
            sessionId={sessionId}
            isInstructor={tokenData.session?.isInstructor}
          />
             <span className="flex items-center gap-1 text-white/50 text-sm">
   👥 {participants}
   </span>
          <button onClick={() => navigate(-1)}
            className="btn-ghost p-1.5 text-white/50 hover:text-red-400 text-sm">✕ Leave</button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col overflow-hidden">
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

          {/* Floating reactions */}
          <div className="flex items-center justify-center gap-3 py-2 border-t border-white/10 bg-surface/80 backdrop-blur-sm flex-shrink-0 sticky bottom-0 z-10 overflow-x-auto">
            {['✋', '👍', '❤️', '😂', '🔥', '👏', '🎉'].map(emoji => (
              <button key={emoji} onClick={() => sendReaction(emoji)}
                className="text-xl hover:scale-125 transition-transform active:scale-95">
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-72 border-l border-white/10 flex flex-col bg-surface/50 hidden md:flex">
          {/* Panel tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            {['chat', 'people', 'polls'].map(panel => (
              <button key={panel} onClick={() => setActivePanel(panel)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors ${
                  activePanel === panel
                    ? 'text-brand-400 border-b-2 border-brand-400'
                    : 'text-white/40 hover:text-white'
                }`}>
                {panel === 'people' ? `👥 ${participants}` : panel.charAt(0).toUpperCase() + panel.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden">
            {activePanel === 'chat'  && <ChatPanel sessionId={sessionId} socket={socket} />}
            {activePanel === 'polls' && <PollPanel sessionId={sessionId} socket={socket} isInstructor={tokenData.session?.isInstructor} />}
            {activePanel === 'people' && (
              <div className="p-3 text-white/50 text-sm text-center mt-4">
                {participants} participant{participants !== 1 ? 's' : ''} in this class
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
