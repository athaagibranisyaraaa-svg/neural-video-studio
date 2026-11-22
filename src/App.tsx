import { AuthProvider, useAuth } from './lib/auth';
import { useHashRoute, useSearchParams, navigate } from './lib/router';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Studio from './pages/Studio';
import Projects from './pages/Projects';
import Queue from './pages/Queue';
import Library from './pages/Library';
import AIGenerator from './pages/AIGenerator';
import SettingsPage from './pages/Settings';
import AccountPage from './pages/Account';

function Shell() {
  const { user, loading } = useAuth();
  const hash = useHashRoute();
  const params = useSearchParams(hash);
  const path = hash.split('?')[0] || '/dashboard';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 aurora-bg">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        <div className="text-xs tracking-[0.4em] text-cyan-300/70 font-semibold">INITIALIZING</div>
      </div>
    );
  }
  if (!user) return <AuthPage />;
  if (path === '/' || path === '/auth') { navigate('/dashboard'); return null; }

  let page: React.ReactNode;
  switch (path) {
    case '/dashboard': page = <Dashboard />; break;
    case '/studio': page = <Studio key={params.get('project') || 'new'} projectId={params.get('project')} initialTab={params.get('tab') || undefined} />; break;
    case '/projects': page = <Projects />; break;
    case '/queue': page = <Queue />; break;
    case '/library': page = <Library />; break;
    case '/ai': page = <AIGenerator />; break;
    case '/settings': page = <SettingsPage />; break;
    case '/account': page = <AccountPage />; break;
    default: page = <Dashboard />;
  }
  return <Layout>{page}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
