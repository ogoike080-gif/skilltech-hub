import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Radio } from 'lucide-react';
import {
  LiveKitRoom, VideoConference, ControlBar,
  RoomAudioRenderer, useParticipants
} from '@livekit/components-react';
import '@livekit/components-styles';
import { MessageSquare, Users, Hand, BarChart2, Lightbulb, X, Send, ThumbsUp, Smile } from 'lucide-react';
import { useSessionSocket } from '../../hooks';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const REACTIONS = ['👍','❤️','😂','🔥','👏','🎉'];

function ChatPanel({ sessionId, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => setMessages(prev => [...prev.slice(-200), msg]);
    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [socket]);

  const sendMsg = () => {
    if (!input.trim()) return;
    socket?.emit('chat:message', { sessionId, message: input.trim() });
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-white/30 text-sm text-center mt-8">Chat is quiet… say hello!</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className="flex gap-2">
            <img src={msg.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${msg.userName}`}
              alt="" className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xs font-semibold ${msg.role === 'instructor' ? 'text-brand-400' : 'text-white/70'}`}>{msg.userName}</span>
                {msg.role === 'instructor' && <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 rounded">Instructor</span>}
              </div>
              <p className="text-white/80 text-sm mt-0.5 break-words">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMsg(); }}
            className="input flex-1 text-sm py-2" placeholder="Send a message..." />
          <button onClick={sendMsg} className="btn-primary px-3 py-2"><Send size={15} /></button>
        </div>
      </div>
    </div>
  );
}

function PollPanel({ sessionId, socket, isInstructor }) {
  const [polls, setPolls]     = useState([]);
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions]   = useState(['', '']);

  useEffect(() => {
    if (!socket) return;
    socket.on('classroom:poll:new',   (poll) => setPolls(prev => [poll, ...prev]));
    socket.on('classroom:poll:voted', ({ pollId, userId, optionIndex }) => {
      setPolls(prev => prev.map(p => p.id === pollId
        ? { ...p, votes: { ...p.votes, [userId]: optionIndex } }
        : p));
    });
    return () => { socket.off('classroom:poll:new'); socket.off('classroom:poll:voted'); };
  }, [socket]);

  const createPoll = () => {
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) return;
    socket?.emit('classroom:poll:create', { sessionId, question: question.trim(), options: validOpts });
    setCreating(false); setQuestion(''); setOptions(['', '']);
  };

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      {isInstructor && !creating && (
        <button onClick={() => setCreating(true)} className="btn-primary w-full text-sm">+ Create Poll</button>
      )}
      {creating && (
        <div className="card space-y-3">
          <input value={question} onChange={e => setQuestion(e.target.value)}
            className="input text-sm" placeholder="Poll question..." />
          {options.map((opt, i) => (
            <input key={i} value={opt} onChange={e => { const o = [...options]; o[i] = e.target.value; setOptions(o); }}
              className="input text-sm" placeholder={`Option ${i + 1}`} />
          ))}
          <button onClick={() => setOptions([...options, ''])} className="text-brand-400 text-sm">+ Add option</button>
          <div className="flex gap-2">
            <button onClick={createPoll} className="btn-primary flex-1 text-sm">Launch Poll</button>
            <button onClick={() => setCreating(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
          </div>
        </div>
      )}
      {polls.length === 0 && !creating && (
        <p className="text-white/30 text-sm text-center mt-8">No polls yet</p>
      )}
      {polls.map(poll => {
        const totalVotes = Object.keys(poll.votes).length;
        return (
          <div key={poll.id} className="card">
            <p className="text-white font-medium mb-3">{poll.question}</p>
            {poll.options.map((opt, i) => {
              const votes = Object.values(poll.votes).filter(v => v === i).length;
              const pct   = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
              return (
                <div key={i} className="mb-2">
                  <div className="flex justify-between text-sm text-white/70 mb-1">
                    <button onClick={() => socket?.emit('classroom:poll:vote', { sessionId, pollId: poll.id, optionIndex: i })}
                      className="hover:text-white transition-colors">{opt}</button>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-white/30 text-xs mt-2">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function ClassroomPage() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const [tokenData, setTokenData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [activePanel, setActivePanel] = useState('chat');
  const [participants, setParticipants] = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [floatingReactions, setFloatReactions] = useState([]);

  // 2) Add new state near the top of ClassroomPage(), alongside the
//    existing useState lines:
const [needsCodeGate, setNeedsCodeGate] = useState(false);
const [verifying, setVerifying] = useState(false);
const [gateCode, setGateCode] = useState('');
const [gatePasscode, setGatePasscode] = useState('');
const [joinGrant, setJoinGrant] = useState(null);

  const { emit, socket } = useSessionSocket(sessionId, {
    'session:participants': ({ count }) => setParticipants(count),
    'classroom:hand-raised': ({ userId }) => toast(`✋ Someone raised their hand`, { icon: '✋' }),
    'classroom:reaction': ({ userName, emoji }) => {
      const id = Date.now();
      setFloatReactions(prev => [...prev, { id, emoji, userName }]);
      setTimeout(() => setFloatReactions(prev => prev.filter(r => r.id !== id)), 3000);
    },
  });

  //    AFTER:
useEffect(() => {
  api.get(`/live/${sessionId}/token`).then(r => {
    setTokenData(r.data.data);
  }).catch(err => {
    const status = err.response?.status;
    const msg = err.response?.data?.message || '';
    if (status === 403 && msg.includes('meeting code')) {
      // Not the instructor, hasn't verified the code yet — show the gate
      // instead of bouncing away.
      setNeedsCodeGate(true);
    } else {
      toast.error(msg || 'Failed to join session');
      navigate('/live');
    }
  }).finally(() => setLoading(false));
}, [sessionId]);


// 4) Add this handler function inside ClassroomPage(), anywhere
//    near toggleHand/sendReaction:
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
    // Now redeem the grant for the actual Livekit token
    const tokenRes = await api.get(`/live/${sessionId}/token?grant=${encodeURIComponent(grant)}`);
    setTokenData(tokenRes.data.data);
    setNeedsCodeGate(false);
  } catch (err) {
    toast.error(err.response?.data?.message || 'Could not verify code');
  } finally {
    setVerifying(false);
  }
};

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    emit(next ? 'classroom:raise-hand' : 'classroom:lower-hand', { sessionId });
  };

  const sendReaction = (emoji) => {
    emit('classroom:reaction', { sessionId, emoji });
  };

  // 5) Add this gate UI as a new early return, placed AFTER the
  //    existing `if (loading) return (...)` block and BEFORE the
  //    `if (!tokenData) return null;` line:
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
              <input
                value={gateCode}
                onChange={e => setGateCode(e.target.value)}
                className="input text-center text-lg font-mono tracking-wider"
                placeholder="123 456 789"
                maxLength={11}
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1.5 block flex items-center gap-1.5">
                <Lock size={13} /> Passcode
              </label>
              <input
                value={gatePasscode}
                onChange={e => setGatePasscode(e.target.value.toUpperCase())}
                className="input text-center font-mono tracking-wider"
                placeholder="ABC123"
                maxLength={6}
              />
            </div>
            <button type="submit" disabled={verifying} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {verifying ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Join Class'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }
  

  if (loading) return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Joining classroom...</p>
      </div>
    </div>
  );

  if (!tokenData) return null;


  return (
    <div className="
      fixed inset-0 z-50 bg-black
      flex flex-col
      md:relative md:inset-auto md:h-screen
    ">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-50 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full live-indicator" />
          <span className="text-white font-semibold text-sm">{tokenData.session?.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-white/50 text-sm"><Users size={14} />{participants}</span>
          <button onClick={() => navigate(-1)} className="btn-ghost p-1.5 text-white/50 hover:text-red-400"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Video area */}
        <div className="
          flex-1 min-h-0 relative
          w-full
          aspect-[9/16] md:aspect-video
          max-h-screen
          overflow-hidden
        ">
          







  <LiveKitRoom
  token={tokenData.token}
  serverUrl={tokenData.serverUrl}
  connect={true}
  options={{
    adaptiveStream: true,
    dynacast: true,
  }}
>
<VideoConference />

<ControlBar
  controls={{
    microphone: true,
    camera: true,
    screenShare: true,
    chat: true,
    participants: true,
    leave: true,
    settings: true,
  }}
/>

<RoomAudioRenderer />
</LiveKitRoom>


          {/* Floating reactions */}
          <div className="absolute bottom-20 right-4 space-y-2 pointer-events-none">
            {floatingReactions.map(r => (
              <div key={r.id} className="flex items-center gap-2 bg-black/60 rounded-full px-3 py-1 animate-slide-up">
                <span className="text-xl">{r.emoji}</span>
                <span className="text-white/70 text-xs">{r.userName}</span>
              </div>
            ))}
          </div>

          {/* Reaction bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 safe-area-bottom">
            <button onClick={toggleHand}
              className={`p-2 rounded-full transition-colors ${handRaised ? 'bg-yellow-500/30 text-yellow-400' : 'hover:bg-white/10 text-white/60'}`}>
              <Hand size={18} />
            </button>
            {REACTIONS.map(emoji => (
              <button key={emoji} onClick={() => sendReaction(emoji)}
                className="text-xl hover:scale-125 transition-transform p-1">
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full md:w-72 flex-shrink-0 flex flex-col bg-surface-50 border-t md:border-t-0 md:border-l border-white/10 max-h-[40vh] md:max-h-none">
          {/* Panel tabs */}
          <div className="flex border-b border-white/10">
            {[
              { id: 'chat',       icon: MessageSquare, label: 'Chat' },
              { id: 'people',     icon: Users,         label: 'People' },
              { id: 'polls',      icon: BarChart2,     label: 'Polls' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActivePanel(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors border-b-2 ${
                  activePanel === tab.id ? 'border-brand-500 text-brand-400' : 'border-transparent text-white/40 hover:text-white'}`}>
                <tab.icon size={14} />{tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activePanel === 'chat'   && <ChatPanel sessionId={sessionId} socket={socket} />}
            {activePanel === 'polls'  && <PollPanel sessionId={sessionId} socket={socket} isInstructor={tokenData.session?.isInstructor} />}
            {activePanel === 'people' && (
              <div className="p-3">
                <p className="text-white/50 text-sm text-center mt-8">{participants} participant{participants !== 1 ? 's' : ''} in this class</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/*
ADD THIS TO frontend/src/styles/globals.css

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
*/
