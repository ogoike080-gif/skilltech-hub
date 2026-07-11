import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Zap, Code, RefreshCw } from 'lucide-react';
import api from '../../utils/api';

function Message({ role, content, isStreaming }) {
  return (
    <div className={`flex gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${role === 'assistant' ? 'bg-brand-500/20' : 'bg-surface-100'}`}>
        {role === 'assistant' ? <Bot size={16} className="text-brand-400" /> : <User size={16} className="text-white/60" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${role === 'user' ? 'bg-brand-500/20 text-white' : 'bg-surface-50 border border-white/10 text-white/90'}`}>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-brand-400 ml-1 animate-pulse rounded-sm align-middle" />}
        </div>
      </div>
    </div>
  );
}

const QUICK = [
  'Explain this concept with a simple example',
  'What are the best practices for this topic?',
  'Create a quiz to test my understanding',
  'What should I learn next after this?',
];

export default function AiTutorPage() {
  const [messages, setMessages]         = useState([{ role: 'assistant', content: "Hi! I'm your AI tutor. I can explain concepts, help debug code, generate quizzes, and create personalized study plans. What would you like to learn today?" }]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [activeTab, setActiveTab]       = useState('chat');
  const [codeInput, setCodeInput]       = useState('');
  const [convId, setConvId]             = useState(null);
  const [conversations, setConversations] = useState([]);
  const endRef   = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    api.get('/ai/conversations').then(r => setConversations(r.data.data || [])).catch(() => {});
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setLoading(true);

    // Add user message + empty assistant placeholder
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMsg },
      { role: 'assistant', content: '', isStreaming: true },
    ]);

    try {
      const token = localStorage.getItem('sth_token');
      abortRef.current = new AbortController();

      const API_BASE = import.meta.env.VITE_API_URL || 'https://skilltech-hub-production.up.railway.app';
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userMsg,
          conversationId: convId,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'text') {
              full += parsed.text;
              // Update the last assistant message in place
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: full, isStreaming: true };
                return updated;
              });
            }
            if (parsed.type === 'done') {
              setConvId(parsed.conversationId);
            }
          } catch {}
        }
      }

      // Mark streaming as done
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: full || '(No response — check your API key)', isStreaming: false };
        return updated;
      });

    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: err.message.includes('API_KEY') || err.message.includes('401')
            ? '⚠️ AI Tutor is not configured. Please add your ANTHROPIC_API_KEY to the backend .env file.'
            : `⚠️ Error: ${err.message}`,
          isStreaming: false,
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }, [loading, convId]);

  const handleExplainCode = async () => {
    if (!codeInput.trim() || loading) return;
    setActiveTab('chat');
    await sendMessage(`Please explain this code:\n\`\`\`\n${codeInput}\n\`\`\``);
    setCodeInput('');
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 hidden lg:flex flex-col gap-3">
        <div className="card">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Zap size={16} className="text-brand-400" /> Quick Actions
          </h3>
          {QUICK.map(q => (
            <button key={q} onClick={() => sendMessage(q)} disabled={loading}
              className="w-full text-left text-white/60 hover:text-white text-sm py-2 px-3 rounded-lg hover:bg-white/5 transition-colors block mb-1 disabled:opacity-40">
              {q}
            </button>
          ))}
        </div>
        <div className="card flex-1 overflow-hidden flex flex-col">
          <h3 className="font-semibold text-white mb-3 text-sm">Recent Conversations</h3>
          <div className="overflow-y-auto space-y-1">
            {conversations.map(c => (
              <button key={c.id} onClick={() => setConvId(c.id)}
                className={`w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors ${convId === c.id ? 'bg-brand-500/10 text-brand-300' : ''}`}>
                <p className="text-white/70 text-xs truncate">{c.title || 'Conversation'}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[{ id:'chat', icon:Bot, label:'AI Chat' }, { id:'code', icon:Code, label:'Explain Code' }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-brand-500 text-white' : 'bg-surface-50 text-white/60 hover:text-white'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
              {messages.map((msg, i) => (
                <Message key={i} role={msg.role} content={msg.content} isStreaming={msg.isStreaming} />
              ))}
              <div ref={endRef} />
            </div>
            <div className="card p-3">
              <div className="flex gap-2">
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  placeholder="Ask me anything about your course, code, or tech concepts..."
                  className="input flex-1 resize-none text-sm !text-black bg-white" rows={2} disabled={loading} />
                <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="btn-primary px-4 py-2 flex-shrink-0">
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-white/30 text-xs mt-2">Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <div className="card flex-1 flex flex-col">
              <h3 className="font-semibold text-white mb-3">Paste your code below</h3>
              <textarea value={codeInput} onChange={e => setCodeInput(e.target.value)}
                placeholder="// Paste your code here..."
                className="input flex-1 font-mono text-sm resize-none !text-black bg-white" rows={14} />
              <button onClick={handleExplainCode} disabled={loading || !codeInput.trim()}
                className="btn-primary mt-4 flex items-center gap-2 justify-center">
                {loading ? <RefreshCw size={16} className="animate-spin" /> : <><Bot size={16} /> Explain This Code</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
