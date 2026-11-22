import { useEffect, useState } from 'react';
import { User, Mail, CalendarDays, LogOut, Film, FolderOpen, Clock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import type { Stats } from '../lib/api';
import { navigate } from '../lib/router';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-[11px] tracking-[0.35em] text-cyan-300/80 font-semibold mb-1">PROFILE</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Account</h1>
      </div>

      <div className="glass rounded-2xl p-7 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-3xl font-bold text-slate-950 shadow-[0_0_40px_hsl(262_90%_60%/0.35)]">
          {user?.name?.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold truncate">{user?.name}</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-slate-400">
            <span className="flex items-center gap-1.5"><Mail size={14} className="text-slate-500" /> {user?.email}</span>
            <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-500" /> Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
          </div>
        </div>
        <button className="btn-ghost ml-auto" onClick={() => { logout(); navigate('/auth'); }}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Film, label: 'Videos generated', value: stats?.totalVideos },
          { icon: FolderOpen, label: 'Projects', value: stats?.projectCount },
          { icon: Clock, label: 'Seconds rendered', value: stats?.totalRenderTime ? Math.round(stats.totalRenderTime) : undefined },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <Icon size={18} className="text-cyan-300 mb-2" />
            <div className="text-2xl font-bold">{value ?? '—'}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <h3 className="flex items-center gap-2 font-semibold mb-3"><User size={16} className="text-violet-300" /> About this workspace</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Projects, render history and exported videos are stored privately under your account on this server.
          Authentication is session-based with signed tokens; passwords are hashed with bcrypt.
        </p>
      </div>
    </div>
  );
}
