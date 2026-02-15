import { Link, useParams } from "react-router-dom";
import { teamsMock } from "@/entities/team";
import type { Prediction } from "@/entities/prediction";

export function PredictionResultPage() {
  const { id } = useParams();
  const history = JSON.parse(localStorage.getItem("predictions") || "[]") as Prediction[];
  const prediction = history.find(p => p.id === id);

  if (!prediction) return <div>Прогноз не найден</div>;

  const t1 = teamsMock.find(t => t.id === prediction.team1Id);
  const t2 = teamsMock.find(t => t.id === prediction.team2Id);
  
  // Вычисляем ширину полосок
  const p1 = prediction.probabilities.team1;
  const p2 = prediction.probabilities.team2;

  return (
    <section style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1 style={{ marginBottom: 10 }}>Результат AI-анализа</h1>
        <p style={{ color: "var(--text-muted)" }}>Модель: GradientBoosting v2.4 • Достоверность: Высокая</p>
      </div>
      
      <div className="card" style={{ padding: "3rem 2rem", marginBottom: "2rem" }}>
        
        {/* Команды и Счёт */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <h2 style={{ fontSize: "1.8rem", margin: 0 }}>{t1?.name}</h2>
            <div style={{ fontSize: "3rem", fontWeight: 800, color: p1 > p2 ? "var(--success)" : "var(--text-muted)" }}>
              {prediction.expectedScore.team1}
            </div>
          </div>

          <div style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "1.5rem" }}>VS</div>

          <div style={{ textAlign: "center", flex: 1 }}>
            <h2 style={{ fontSize: "1.8rem", margin: 0 }}>{t2?.name}</h2>
            <div style={{ fontSize: "3rem", fontWeight: 800, color: p2 > p1 ? "var(--success)" : "var(--text-muted)" }}>
              {prediction.expectedScore.team2}
            </div>
          </div>
        </div>

        {/* Визуализация Вероятности (Bar) */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontWeight: 600 }}>
            <span style={{ color: p1 > 50 ? "var(--accent)" : "var(--text-muted)" }}>Шанс победы: {p1}%</span>
            <span style={{ color: p2 > 50 ? "var(--accent)" : "var(--text-muted)" }}>{p2}%</span>
          </div>
          
          <div style={{ height: 12, background: "var(--bg-input)", borderRadius: 6, overflow: "hidden", display: "flex" }}>
            <div style={{ width: `${p1}%`, background: "var(--accent)", transition: "width 1s ease" }}></div>
            <div style={{ width: `${p2}%`, background: "rgba(255,255,255,0.1)" }}></div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
        <Link to="/prediction/new" className="btn">Новый анализ</Link>
        <Link to="/history" className="btn secondary">В историю</Link>
      </div>
    </section>
  );
}
