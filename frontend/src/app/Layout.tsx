import { Outlet, NavLink } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { 
  Home, 
  Users, 
  Calendar, 
  BarChart3, 
  LogIn, 
  LogOut,
  History, 
  Shield,
  TrendingUp,
  Trophy
} from 'lucide-react';
import { VideoBackground } from '../shared/ui/VideoBackground';
// import { ParallaxCourt } from '../shared/ui/ParallaxCourt'; // 👈 ЗАКОММЕНТИРУЙ ИЛИ УДАЛИ
import { useAuth } from './providers/AuthProvider';

export const Layout = () => {
  const { user, logout, isAdmin } = useAuth();
  const particlesRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 2 + 1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249, 115, 22, ${0.05})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/teams', icon: Trophy, label: 'Команды' },
    { path: '/players', icon: Users, label: 'Игроки' },
    { path: '/matches', icon: Calendar, label: 'Матчи' },
    { path: '/prediction/new', icon: TrendingUp, label: 'AI Прогноз' },
    { path: '/history', icon: History, label: 'История' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500 selection:text-slate-950 overflow-x-hidden relative">
      {/* Background Animated Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-glow pointer-events-none z-[1]" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-glow pointer-events-none z-[1]" style={{ animationDelay: '1.5s' }} />

      <VideoBackground videoSrc="/videos/basketball-bg.mp4" />
      {/* <ParallaxCourt /> */} {/* 👈 ЗАКОММЕНТИРОВАНО */}
      
      <canvas
        ref={particlesRef}
        className="fixed inset-0 pointer-events-none z-[2]"
      />

      <header className="relative z-20 border-b border-white/5 bg-slate-950/60 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <NavLink to="/" className="group flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-all duration-300">
                <span className="text-white font-black text-xl">🏀</span>
              </div>
              <div>
                <span className="text-xl font-black tracking-tight font-spacegrotesk">
                  Hoops<span className="text-orange-500">AI</span>
                </span>
                <span className="ml-2 text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">
                  PRO
                </span>
              </div>
            </NavLink>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">{item.label}</span>
                </NavLink>
              ))}

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">Админ</span>
                </NavLink>
              )}

              {user ? (
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 border border-orange-400/20">
                      <span className="text-white font-bold text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="hidden md:block">
                      <div className="text-sm font-bold text-white leading-none mb-1">{user.username}</div>
                      <div className="text-xs text-slate-400 capitalize leading-none">{user.role}</div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                    title="Выйти"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <NavLink to="/auth" className="ml-2 px-4 py-2 rounded-xl flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-300">
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">Вход</span>
                </NavLink>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-20 max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;