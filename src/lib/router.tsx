import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/** Tiny hash router: routes look like '#/studio?tab=code' */
export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/dashboard');
  useEffect(() => {
    const fn = () => setHash(window.location.hash.slice(1) || '/dashboard');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  return hash;
}

export function navigate(to: string) {
  window.location.hash = '#' + to;
}

export function useNavigate() {
  return useCallback((to: string) => navigate(to), []);
}

export function useSearchParams(hash: string): URLSearchParams {
  const q = hash.split('?')[1] || '';
  return new URLSearchParams(q);
}

interface NavProps {
  to: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
}

export function NavLink({ to, children, className = '', activeClassName = '', onClick }: NavProps) {
  const hash = useHashRoute();
  const path = hash.split('?')[0];
  const target = to.split('?')[0];
  const active = path === target;
  return (
    <a href={'#' + to} onClick={onClick} className={`${className} ${active ? activeClassName : ''}`}>
      {children}
    </a>
  );
}
