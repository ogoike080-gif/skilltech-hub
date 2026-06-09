import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

  const { emit } = useSessionSocket(sessionId, {
    'session:participants': ({ count }) => setParticipants(count),
    'classroom:hand-raised': ({ userId }) => toast(`✋ Someone raised their hand`, { icon: '✋' }),
    'classroom:reaction': ({ userName, emoji }) => {
      const id = Date.now();
      setFloatReactions(prev => [...prev, { id, emoji, userName }]);
      setTimeout(() => setFloatReactions(prev => prev.filter(r => r.id !== id)), 3000);
    },
  });

  useEffect(() => {
    api.get(`/live/${sessionId}/token`).then(r => {
      setTokenData(r.data.data);
    }).catch(err => {
      toast.error(err.response?.data?.message || 'Failed to join session');
      navigate('/live');
    }).finally(() => setLoading(false));
  }, [sessionId]);

  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    emit(next ? 'classroom:raise-hand' : 'classroom:lower-hand', { sessionId });
  };

  const sendReaction = (emoji) => {
    emit('classroom:reaction', { sessionId, emoji });
  };

  if (loading) return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60">Joining classroom...</p>
      </div>
    </div>
  );

  if (!tokenData) return null;

  const socket = null; // useSocket() would be called here in real app

  return (
    <div className="fixed inset-0 bg-surface flex flex-col overflow-hidden">
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

      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative overflow-hidden">
          <LiveKitRoom
            token={tokenData.token}
            serverUrl={tokenData.serverUrl}
            connect={true}
            video={tokenData.session?.isInstructor}
            audio={tokenData.session?.isInstructor}
          >
            <VideoConference />
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
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
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
        <div className="w-72 flex-shrink-0 flex flex-col bg-surface-50 border-l border-white/10">
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
