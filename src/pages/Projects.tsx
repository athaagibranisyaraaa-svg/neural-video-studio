import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FolderOpen, Pencil, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { Project } from '../lib/api';
import { navigate } from '../lib/router';

export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = () => api.projects().then(d => setProjects(d.projects)).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async () => {
    const { project } = await api.createProject({ name: `Untitled ${new Date().toLocaleDateString()}` });
    navigate(`/studio?project=${project.id}`);
  };

  const rename = async (id: string) => {
    if (!renameVal.trim()) return setRenaming(null);
    await api.saveProject(id, { name: renameVal.trim() });
    setRenaming(null); load();
  };

  const remove = async (id: string) => {
    await api.deleteProject(id);
    setConfirmDel(null); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.35em] text-cyan-300/80 font-semibold mb-1">LIBRARY</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">My Projects</h1>
        </div>
        <button className="btn-primary" onClick={create}><Plus size={16} /> New Project</button>
      </div>
      {error && <div className="glass rounded-xl px-4 py-3 text-rose-300">{error}</div>}

      {!projects ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-cyan-300" /></div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center">
          <FolderOpen size={40} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 mb-6">No projects yet. Create one to start turning code into video.</p>
          <button className="btn-primary" onClick={create}><Plus size={16} /> Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 group hover:border-cyan-400/40 transition-all">
              <div className="flex items-start justify-between gap-2 mb-3">
                {renaming === p.id ? (
                  <input autoFocus className="input-dark !py-1.5 text-sm" value={renameVal}
                    onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && rename(p.id)}
                    onBlur={() => rename(p.id)} />
                ) : (
                  <h3 className="font-bold truncate">{p.name}</h3>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button aria-label="Rename" onClick={() => { setRenaming(p.id); setRenameVal(p.name); }}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 cursor-pointer"><Pencil size={14} /></button>
                  <button aria-label="Delete" onClick={() => setConfirmDel(p.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-500 space-y-1 mb-4">
                <div>{p.settings.width}×{p.settings.height} · {p.settings.fps}fps · {p.settings.duration}s · {p.settings.format.toUpperCase()}</div>
                <div>Updated {new Date(p.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary flex-1 !py-2 text-sm" onClick={() => navigate(`/studio?project=${p.id}`)}>
                  Open <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDel(null)} />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-6 w-full max-w-sm relative z-10">
            <h3 className="font-bold mb-2">Delete project?</h3>
            <p className="text-sm text-slate-400 mb-5">This permanently removes the project and its saved code. Rendered videos in your library are not affected.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="btn-primary flex-1 !bg-none !bg-rose-500 !text-white" onClick={() => remove(confirmDel)}>Delete</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
