import { useState, useRef } from 'react';
import api from '../utils/api';

export function useAI() {
  const [loading, setLoading]       = useState(false);
  const [streaming, setStreaming]   = useState(false);
  const [response, setResponse]     = useState('');
  const [conversationId, setConvId] = useState(null);

  const chat = async ({ message, courseId, lessonId, conversationId: convId }) => {
    setLoading(true);
    setStreaming(true);
    setResponse('');

    try {
      const token = localStorage.getItem('sth_token');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message, conversationId: convId, courseId, lessonId }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'text')  { full += parsed.text; setResponse(full); }
            if (parsed.type === 'done')  setConvId(parsed.conversationId);
          } catch {}
        }
      }
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const generateQuiz = async (lessonId, numQuestions = 5) => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-quiz', { lessonId, numQuestions });
      return data.data.questions;
    } finally { setLoading(false); }
  };

  const explainCode = async (code, language, question) => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/explain-code', { code, language, question });
      return data.data.explanation;
    } finally { setLoading(false); }
  };

  return { chat, generateQuiz, explainCode, response, loading, streaming, conversationId };
}
