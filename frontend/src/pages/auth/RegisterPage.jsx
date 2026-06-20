import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Zap, Github, Check } from 'lucide-react';
import { useAuth } from '../../hooks';

const ROLES = [
  { id: 'student',    label: 'Student',    desc: 'I want to learn new tech skills' },
  { id: 'instructor', label: 'Instructor', desc: 'I want to teach and create courses' },
];

export default function RegisterPage() {
  const [form, setForm]   = useState({ firstName: '', lastName: '', email: '', password: '', role: 'student' });
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strengthColor = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const ps = passwordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-grid-pattern">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-black text-2xl mb-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="gradient-text">SkillTech Hub</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">Create your account</h1>
          <p className="text-white/50 mt-1">Start your tech learning journey today — it's free</p>
        </div>

        <div className="card">
          {/* OAuth */}
      


      In frontend/src/pages/auth/RegisterPage.jsx, find this block:

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <a href="/api/auth/google" className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-4 h-4" />
              Google
            </a>
            <button onClick={() => window.location.href = '/api/auth/google'}></button>
            <a href="/api/auth/github" className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5">
              <Github size={16} /> GitHub
            </a>
          </div>

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <a href={`${import.meta.env.VITE_API_URL || 'https://skilltech-hub-production.up.railway.app'}/api/auth/google`}
               className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-4 h-4" />
              Google
            </a>
            <a href={`${import.meta.env.VITE_API_URL || 'https://skilltech-hub-production.up.railway.app'}/api/auth/github`}
               className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5">
              <Github size={16} /> GitHub
            </a>

          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">or sign up with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Role selection */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLES.map(role => (
              <button key={role.id} type="button" onClick={() => setForm({ ...form, role: role.id })}
                className={`p-3 rounded-xl border text-left transition-all ${form.role === role.id ? 'border-brand-500 bg-brand-500/10' : 'border-white/10 hover:border-white/30'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium text-sm">{role.label}</span>
                  {form.role === role.id && <Check size={14} className="text-brand-400" />}
                </div>
                <span className="text-white/40 text-xs">{role.desc}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">First name</label>
                <input type="text" required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className="input" placeholder="John" />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-medium mb-1.5">Last name</label>
                <input type="text" required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className="input" placeholder="Doe" />
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-1.5">Email</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="input" placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input pr-10" placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= ps ? strengthColor[ps] : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-white/40">{strengthLabel[ps]} password</p>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading
                ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</span>
                : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
          </p>
          <p className="text-center text-white/20 text-xs mt-3">
            By registering, you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
