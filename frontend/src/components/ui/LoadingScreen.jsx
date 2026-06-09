// ============================================================
// components/ui/LoadingScreen.jsx
// ============================================================
import React from 'react';
import { Zap } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-surface flex items-center justify-center z-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-glow">
          <Zap size={32} className="text-brand-400" />
        </div>
        <div className="flex gap-1 justify-center">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
