import { NavLink } from 'react-router-dom';
import { Activity, Home, List, Server, Settings, Shield } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { path: '/', label: 'Overview', icon: Home },
  { path: '/services', label: 'Services', icon: Server },
  { path: '/traffic', label: 'Traffic', icon: Activity },
  { path: '/rate-limits', label: 'Rate Limits', icon: Shield },
  { path: '/requests', label: 'Requests', icon: List },
  { path: '/system', label: 'System', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-60 bg-surface-800 border-r border-subtle flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-subtle shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold shadow-lg">
            PG
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 leading-tight">PulseGate</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Ops Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent-500/10 text-accent-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700/50'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
