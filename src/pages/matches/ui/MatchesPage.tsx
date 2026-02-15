import { Link } from "react-router-dom";
import { matchesMock } from "@/entities/match";

export function MatchesPage() {
  return (
    <section>
      <h1>Матчи</h1>

      <ul>
        {matchesMock.map((m) => (
          <li key={m.id}>
            <Link to={`/matches/${m.id}`}>
              {m.homeTeam.name} — {m.awayTeam.name}
            </Link>
            {" · "}
            {m.status === "finished" && m.score ? `${m.score.home}:${m.score.away}` : "запланирован"}
          </li>
        ))}
      </ul>
    </section>
  );
}
