import { Link, useParams } from "react-router-dom";
import { matchesMock } from "@/entities/match";

export function MatchPage() {
  const { matchId } = useParams();
  const id = Number(matchId);

  // Лог для отладки (посмотри в консоль браузера F12)
  console.log("MatchPage param:", matchId, "Parsed ID:", id);

  const match = matchesMock.find((m) => m.id === id);

  if (!match) {
    return (
      <section>
        <h1>Матч не найден (ID: {matchId})</h1>
        <Link to="/matches">← Назад к списку</Link>
      </section>
    );
  }

  return (
    <section>
      <Link to="/matches">← Назад к списку</Link>
      <h1>{match.homeTeam.name} — {match.awayTeam.name}</h1>
      <p>Дата: {new Date(match.date).toLocaleString()}</p>
      <p>Статус: {match.status}</p>
    </section>
  );
}
