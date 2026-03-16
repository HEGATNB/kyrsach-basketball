from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import List, Optional, Dict, Any


class MatchService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_matches(self, filters: Dict = None, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Получение всех матчей"""
        try:
            query = """
                SELECT 
                    g.game_id,
                    g.game_date,
                    g.team_id_home,
                    g.team_id_away,
                    g.pts_home,
                    g.pts_away,
                    g.wl_home,
                    g.wl_away,
                    g.season_id,
                    g.season_type,
                    home.full_name as home_team_name,
                    home.abbreviation as home_team_abbrev,
                    away.full_name as away_team_name,
                    away.abbreviation as away_team_abbrev
                FROM game g
                LEFT JOIN team home ON g.team_id_home = home.id
                LEFT JOIN team away ON g.team_id_away = away.id
            """

            where_clauses = []
            params = {}

            if filters and filters.get("status"):
                if filters["status"] == "finished":
                    where_clauses.append("g.wl_home IS NOT NULL")
                elif filters["status"] == "scheduled":
                    where_clauses.append("g.wl_home IS NULL")

            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)

            query += " ORDER BY g.game_date DESC LIMIT :limit OFFSET :skip"
            params["limit"] = limit
            params["skip"] = skip

            result = self.db.execute(text(query), params).fetchall()

            matches = []
            for row in result:
                game = dict(row._mapping)

                # Определяем статус
                has_score = game.get("pts_home") is not None
                status = "finished" if has_score else "scheduled"

                # Форматируем дату
                game_date = game.get("game_date")
                if game_date and isinstance(game_date, datetime):
                    # Если время 00:00, устанавливаем стандартное 19:00
                    if game_date.hour == 0 and game_date.minute == 0:
                        game_date = game_date.replace(hour=19, minute=0)

                match = {
                    "id": hash(str(game.get("game_id"))),  # Генерируем числовой ID
                    "game_id": game.get("game_id"),
                    "date": game_date.isoformat() if game_date else None,
                    "status": status,
                    "home_team_id": game.get("team_id_home"),
                    "away_team_id": game.get("team_id_away"),
                    "home_team": {
                        "id": game.get("team_id_home"),
                        "name": game.get("home_team_name", f"Team {game.get('team_id_home')}"),
                        "abbrev": game.get("home_team_abbrev", f"T{game.get('team_id_home')}")
                    },
                    "away_team": {
                        "id": game.get("team_id_away"),
                        "name": game.get("away_team_name", f"Team {game.get('team_id_away')}"),
                        "abbrev": game.get("away_team_abbrev", f"T{game.get('team_id_away')}")
                    },
                    "home_score": game.get("pts_home"),
                    "away_score": game.get("pts_away"),
                    "season": game.get("season_id"),
                    "season_type": game.get("season_type")
                }
                matches.append(match)

            return matches

        except Exception as e:
            print(f"❌ Ошибка получения матчей: {e}")
            return []