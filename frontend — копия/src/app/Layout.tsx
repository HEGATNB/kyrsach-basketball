import { Outlet, NavLink } from 'react-router-dom';

export const Layout = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      {/* Фоновые градиенты */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-600/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-blue-600/10 blur-[140px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Хедер */}
        <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight">
                Hoops<span className="text-orange-500">AI</span>
              </span>
            </NavLink>
            <nav className="flex items-center gap-3 text-sm">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-3 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-orange-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                Главная
              </NavLink>
              <NavLink
                to="/teams"
                className={({ isActive }) =>
                  `px-3 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-orange-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                Команды
              </NavLink>
              <NavLink
                to="/matches"
                className={({ isActive }) =>
                  `px-3 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-orange-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                Матчи
              </NavLink>
              <NavLink
                to="/auth"
                className={({ isActive }) =>
                  `px-3 py-1 rounded-full transition-colors ${
                    isActive ? 'bg-orange-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                Логин
              </NavLink>
            </nav>
          </div>
        </header>

        {/* Контент */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
