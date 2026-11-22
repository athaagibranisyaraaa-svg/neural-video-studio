import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from '../lib/router';
import { useAuth } from '../lib/auth';
import {
  LayoutDashboard, Clapperboard, Code2, Sparkles, FolderOpen, ListVideo,
  Film, Settings, User, LogOut, Menu, X, Zap,
} from 'lucide-react';
import Particles from './Particles';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/studio', label: 'Create Video', icon: Clapperboard },
  { to: '/studio?tab=code', label: 'Code Editor', icon: Code2 },
  { to: '/ai', label: 'AI Generator', icon: Sparkles },
  { to: '/projects', label: 'My Projects', icon: FolderOpen },
  { to: '/queue', label: 'Rendering Queue', icon: ListVideo },
  { to: '/library', label: 'Video Library', icon: Film },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/account', label: 'Account', icon: User },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 pt-7 pb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-400 to-violet-500 shadow-[0_0_24px_hsl(199_100%_55%/0.5)]">
          <Zap size={20} className="text-slate-950" fill="currentColor" />
        </div>
        <div>
          <div className="font-bold tracking-[0.18em] text-sm glow-text">NEURAL</div>
          <div className="text-[10px] tracking-[0.3em] text-cyan-300/80 font-semibold">VIDEO STUDIO</div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scroll-slim">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={label} to={to}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            activeClassName="bg-gradient-to-r from-cyan-400/15 to-violet-500/10 text-cyan-200 border border-cyan-400/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <Icon size={17} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/5">
        <div className="glass-soft rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center font-bold text-slate-950 text-sm">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{user?.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
          </div>
          <button onClick={() => { logout(); navigate('/auth'); }} aria-label="Log out"
            className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"><LogOut size={16} /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="aurora-bg" /><div className="grain" />
      <Particles density={60} />
      {/* desktop */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 glass border-r border-white/5 z-20">{sidebar}</aside>
      {/* mobile topbar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 glass flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 font-bold tracking-widest text-sm">
          <Zap size={16} className="text-cyan-300" fill="currentColor" /> NEURAL VIDEO STUDIO
        </div>
        <button onClick={() => setOpen(!open)} aria-label="Menu" className="text-slate-200 cursor-pointer">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 inset-y-0 w-72 glass">{sidebar}</aside>
        </div>
      )}
      <main className="lg:pl-64 pt-14 lg:pt-0 relative z-10">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
