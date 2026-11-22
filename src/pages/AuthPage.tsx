import { useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import Particles from '../components/Particles';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="aurora-bg" /><div className="grain" />
      <Particles density={90} />
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md glass rounded-3xl p-8 sm:p-10 relative z-10 neon-border">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-cyan-400 to-violet-500 shadow-[0_0_40px_hsl(199_100%_55%/0.5)] mb-4">
            <Zap size={26} className="text-slate-950" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold tracking-[0.15em] glow-text">NEURAL</h1>
          <p className="text-[11px] tracking-[0.35em] text-cyan-300/80 font-semibold mt-1">VIDEO STUDIO</p>
          <p className="text-sm text-slate-400 mt-4 text-center">Turn source code into cinematic video — render, preview and download.</p>
        </div>

        <div className="flex glass-soft rounded-xl p-1 mb-6">
          {(['login', 'register'] as const).map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${mode === m ? 'bg-gradient-to-r from-cyan-400/25 to-violet-500/20 text-cyan-100 border border-cyan-400/30' : 'text-slate-400 hover:text-slate-200'}`}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="auth-name">Name</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="auth-name" className="input-dark pl-10" placeholder="Ada Lovelace" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            </div>
          )}
          <div>
            <label className="label" htmlFor="auth-email">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input id="auth-email" type="email" className="input-dark pl-10" placeholder="you@studio.ai" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="auth-pass">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input id="auth-pass" type="password" className="input-dark pl-10" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
          {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-2.5">{error}</motion.div>}
          <button type="submit" disabled={busy} className="btn-primary w-full !py-3">
            {busy && <Loader2 size={16} className="animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-[11px] text-slate-500 mt-6 tracking-wide">Your projects and renders are stored securely under your account.</p>
      </motion.div>
    </div>
  );
}
