import { Link } from "react-router-dom";
import { teamsMock } from "@/entities/team";
import type { Prediction } from "@/entities/prediction";

export function HistoryPage() {
  // Достаём список прогнозов из localStorage
  const history = JSON.parse(localStorage.getItem("predictions") || "[]") as Prediction[];

  // Сортируем: новые сверху
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (history.length === 0) {
    return (
      <section>
        <h1>История прогнозов</h1>
        <p>Вы пока не делали прогнозов.</p>
        <Link to="/prediction/new">Создать первый прогноз</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>История прогнозов</h1>
      
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
            <th style={{ padding: 10 }}>Дата</th>
            <th style={{ padding: 10 }}>Матч</th>
            <th style={{ padding: 10 }}>Прогноз AI</th>
            <th style={{ padding: 10 }}>Счёт (ожид.)</th>
            <th style={{ padding: 10 }}></th>
          </tr>
        </thead>
        <tbody>
          {sortedHistory.map((item) => {
            const t1 = teamsMock.find((t) => t.id === item.team1Id);
            const t2 = teamsMock.find((t) => t.id === item.team2Id);
            const date = new Date(item.createdAt).toLocaleString();
            
            // Кто победит по мнению AI?
            const winner = item.probabilities.team1 > item.probabilities.team2 ? t1?.name : t2?.name;
            const prob = Math.max(item.probabilities.team1, item.probabilities.team2);

            return (
              <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 10 }}>{date}</td>
                <td style={{ padding: 10 }}>{t1?.name} — {t2?.name}</td>
                <td style={{ padding: 10 }}>
                  Победа <b>{winner}</b> ({prob}%)
                </td>
                <td style={{ padding: 10 }}>
                  {item.expectedScore.team1}:{item.expectedScore.team2}
                </td>
                <td style={{ padding: 10 }}>
                  <Link to={`/prediction/${item.id}`}>Детали</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
