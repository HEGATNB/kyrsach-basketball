import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { dbTeams } from "@/shared/api/db";
import { useEffect, useState } from "react";
import type { Team } from "@/entities/team";

export function TeamsPage() {
  const { isAdmin } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    setTeams(dbTeams.getAll());
  }, []);

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>Команды лиги</h1>
        {isAdmin && (
          <Link to="/teams/create" className="btn">
            + Добавить команду
          </Link>
        )}
      </div>

      {/* Grid Layout - Сетка карточек */}
      <div className="grid">
        {teams.map((t) => (
          <Link to={`/teams/${t.id}`} key={t.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 15 }}>
                <div style={{ 
                  width: 50, height: 50, 
                  background: "var(--bg-input)", 
                  borderRadius: "50%", 
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.2rem"
                }}>
                  🏀
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{t.name}</h3>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>ID: {t.id}</span>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                <div>
                  <div style={{ color: "var(--text-muted)" }}>Победы</div>
                  <div style={{ color: "var(--success)", fontWeight: 700, fontSize: "1.1rem" }}>{t.wins}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "var(--text-muted)" }}>Поражения</div>
                  <div style={{ color: "var(--danger)", fontWeight: 700, fontSize: "1.1rem" }}>{t.losses}</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
