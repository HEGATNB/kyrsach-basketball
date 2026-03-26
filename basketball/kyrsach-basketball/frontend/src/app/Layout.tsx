import { Outlet, NavLink } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  Cpu,
  History,
  Home,
  LogIn,
  LogOut,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { VideoBackground } from '../shared/ui/VideoBackground';
import { useAuth } from './providers/AuthProvider';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/teams', icon: Trophy, label: 'Teams' },
  { path: '/players', icon: Users, label: 'Players' },
  { path: '/matches', icon: CalendarDays, label: 'Matches' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/prediction/new', icon: Cpu, label: 'Predict' },
  { path: '/history', icon: History, label: 'History' },
];

export const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const displayName = user?.name || user?.username || 'Guest';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--page-bg)] text-[var(--text-main)]">
      <VideoBackground videoSrc="/videos/basketball-bg.mp4" overlayOpacity={0.16} playbackSpeed={0.82} />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(circle_at_top_left,rgba(208,121,57,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(53,87,116,0.08),transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 z-[2] bg-[linear-gradient(180deg,rgba(4,5,8,0.4),rgba(4,5,8,0.62),rgba(4,5,8,0.76))]" />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-[rgba(247,240,226,0.08)] bg-[rgba(6,8,11,0.78)] backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl border border-white/10">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <NavLink to="/" className="font-spacegrotesk text-xl font-bold tracking-tight text-white">
                    CourtVision Pro
                  </NavLink>
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                    NBA intelligence workspace
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="badge-live">
                  <span className="h-2 w-2 rounded-full bg-[rgba(196,218,184,0.92)] shadow-[0_0_18px_rgba(196,218,184,0.45)]" />
                  Live Data Sync
                </div>

                {user ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[rgba(247,240,226,0.08)] bg-[rgba(255,248,238,0.03)] px-3 py-2">
                    <div className="brand-mark-cool flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{user.role}</p>
                    </div>
                    <button
                      onClick={logout}
                      className="rounded-xl border border-[rgba(247,240,226,0.08)] bg-[rgba(255,248,238,0.03)] p-2 text-slate-300 transition hover:border-[rgba(141,107,93,0.28)] hover:bg-[rgba(141,107,93,0.12)] hover:text-[#f3dfd6]"
                      title="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <NavLink
                    to="/auth"
                    className="btn-secondary px-4 py-2"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </NavLink>
                )}
              </div>
            </div>

            <div className="no-scrollbar overflow-x-auto">
              <nav className="flex min-w-max items-center gap-5">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-2 border-b-2 px-1 pb-2 pt-1 text-sm font-semibold transition ${
                        isActive
                          ? 'border-[rgba(201,106,43,0.9)] text-white'
                          : 'border-transparent text-slate-400 hover:border-[rgba(244,233,215,0.18)] hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                ))}

                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `inline-flex items-center gap-2 border-b-2 px-1 pb-2 pt-1 text-sm font-semibold transition ${
                        isActive
                          ? 'border-[rgba(96,125,150,0.9)] text-white'
                          : 'border-transparent text-slate-400 hover:border-[rgba(244,233,215,0.18)] hover:text-white'
                      }`
                    }
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </NavLink>
                )}
              </nav>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
