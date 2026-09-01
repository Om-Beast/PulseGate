import type { ReactNode } from 'react';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { useLocation } from 'react-router-dom';

const TITLES: Record<string, string> = {
  '/': 'Command Center',
  '/traffic': 'Traffic',
  '/services': 'Services',
  '/rate-limits': 'Rate Limits',
  '/requests': 'Requests',
  '/failures': 'Failures',
  '/system': 'System',
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? 'PulseGate';

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
