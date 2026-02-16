import { Link, useParams } from "react-router-dom";
import { teamsMock } from "@/entities/team";

export function TeamPage() {
  const { teamId } = useParams(); // берём teamId из URL [web:72] (смысл: параметр пути)

  const id = Number(teamId);
  const team = teamsMock.find((t) => t.id === id);

  if (!team) {
    return (
      <section>
        <h1>Команда не найдена</h1>
        <Link to="/teams">← Назад к списку</Link>
      </section>
    );
  }

  return (
    <section>
      <Link to="/teams">← Назад к списку</Link>
      <h1>{team.name}</h1>
      {team.city ? <p>Город: {team.city}</p> : null}

      <h2>Статистика</h2>
      <ul>
        <li>Победы: {team.wins}</li>
        <li>Поражения: {team.losses}</li>
        <li>Средние очки за матч: {team.avgPointsFor}</li>
        <li>Средние пропущенные: {team.avgPointsAgainst}</li>
      </ul>
    </section>
  );
}
