import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { 
  LayoutDashboard, 
  Users, 
  Trophy, 
  BrainCircuit, 
  History, 
  LogOut, 
  ShieldCheck,
  Menu
} from "lucide-react"; // Иконки

export function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: "/", icon: <LayoutDashboard size={20} />, label: "Дашборд" },
    { path: "/matches", icon: <Trophy size={20} />, label: "Матчи" },
    { path: "/teams", icon: <Users size={20} />, label: "Команды" },
    { path: "/prediction/new", icon: <BrainCircuit size={20} />, label: "AI Анализ" },
    { path: "/history", icon: <History size={20} />, label: "История" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      
      {/* SIDEBAR */}
      <aside style={{ 
        width: 260, 
        background: "var(--bg-sidebar)", 
        borderRight: "1px solid var(--border-color)",
        display: "flex", 
        flexDirection: "column",
        padding: "1.5rem 1rem"
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "3rem", paddingLeft: "0.5rem" }}>
          <div style={{ 
            width: 36, height: 36, 
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", 
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 15px rgba(59, 130, 246, 0.5)"
          }}>
            🏀
          </div>
          <span style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.5px" }}>
            Basket<span style={{ color: "var(--primary)" }}>AI</span>
          </span>
        </div>

        {/* Menu */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink 
                key={item.path} 
                to={item.path}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "0.8rem 1rem",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: isActive ? "white" : "var(--text-muted)",
                  background: isActive ? "rgba(59, 130, 246, 0.1)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                  transition: "all 0.2s"
                }}
              >
                {item.icon}
                <span style={{ fontWeight: 500 }}>{item.label}</span>
              </NavLink>
            );
          })}

          {isAdmin && (
            <NavLink to="/admin" style={{
              marginTop: 20,
              display: "flex", alignItems: "center", gap: 12,
              padding: "0.8rem 1rem",
              borderRadius: 8, textDecoration: "none",
              color: "#ef4444", background: "rgba(239, 68, 68, 0.1)"
            }}>
              <ShieldCheck size={20} />
              <span style={{ fontWeight: 600 }}>Админ-панель</span>
            </NavLink>
          )}
        </nav>

        {/* User Footer */}
        {user ? (
          <div style={{ 
            marginTop: "auto", 
            padding: "1rem", 
            background: "rgba(0,0,0,0.2)", 
            borderRadius: 12,
            display: "flex", alignItems: "center", gap: 10
          }}>
            <div style={{ 
              width: 36, height: 36, borderRadius: "50%", background: "#334155", 
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem" 
            }}>
              {user.name[0]}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{user.role}</div>
            </div>
            <button onClick={logout} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="btn-primary" style={{ justifyContent: "center" }}>Войти</NavLink>
        )}
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "2rem 3rem",
        background: "radial-gradient(circle at top right, rgba(59, 130, 246, 0.05), transparent 40%)"
      }}>
        <Outlet />
      </main>
    </div>
  );
}
