from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import sys
import os
from typing import List, Optional, Dict, Any

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class MatchService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_matches(self, filters: Dict = None, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Получение всех матчей с фильтрацией"""
        try:
            # Проверяем, есть ли таблица game
            table_check = self.db.execute(
                text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game')")
            ).scalar()

            if not table_check:
                print("⚠️ Таблица game не найдена в PostgreSQL")
                return []

            # Базовый запрос
            query = """
                SELECT 
                    g.*,
                    home.full_name as home_team_name,
                    home.abbreviation as home_team_abbrev,
                    away.full_name as away_team_name,
                    away.abbreviation as away_team_abbrev
                FROM game g
                LEFT JOIN team home ON g.team_id_home = home.id
                LEFT JOIN team away ON g.team_id_away = away.id
            """
            params = {}

            # Применяем фильтры
            where_clauses = []
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

                # Извлекаем числовой ID
                game_id_str = game.get("game_id", "0")
                try:
                    if "ESPN_" in game_id_str:
                        game_id = int(game_id_str.replace("ESPN_", ""))
                    else:
                        game_id = int(game_id_str)
                except:
                    continue

                # Определяем статус матча
                has_score = game.get("pts_home") is not None and game.get("pts_away") is not None
                status = "finished" if has_score else "scheduled"

                match = {
                    "id": game_id,
                    "date": game.get("game_date", ""),
                    "status": status,
                    "home_team_id": game.get("team_id_home", 0),
                    "away_team_id": game.get("team_id_away", 0),
                    "home_team": {
                        "id": game.get("team_id_home", 0),
                        "name": game.get("home_team_name", f"Team {game.get('team_id_home')}"),
                        "abbrev": game.get("home_team_abbrev", f"T{game.get('team_id_home')}")
                    },
                    "away_team": {
                        "id": game.get("team_id_away", 0),
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

    def get_match_by_id(self, match_id: int) -> Optional[Dict[str, Any]]:
        """Получение матча по ID"""
        try:
            # Пробуем найти по числовому ID или по строковому ESPN_ID
            result = self.db.execute(
                text("""
                    SELECT 
                        g.*,
                        home.full_name as home_team_name,
                        home.abbreviation as home_team_abbrev,
                        away.full_name as away_team_name,
                        away.abbreviation as away_team_abbrev
                    FROM game g
                    LEFT JOIN team home ON g.team_id_home = home.id
                    LEFT JOIN team away ON g.team_id_away = away.id
                    WHERE g.game_id = :id1 OR g.game_id = :id2
                """),
                {"id1": str(match_id), "id2": f"ESPN_{match_id}"}
            ).fetchone()

            if not result:
                return None

            game = dict(result._mapping)

            # Определяем статус матча
            has_score = game.get("pts_home") is not None and game.get("pts_away") is not None
            status = "finished" if has_score else "scheduled"

            return {
                "id": match_id,
                "date": game.get("game_date", ""),
                "status": status,
                "home_team_id": game.get("team_id_home", 0),
                "away_team_id": game.get("team_id_away", 0),
                "home_team": {
                    "id": game.get("team_id_home", 0),
                    "name": game.get("home_team_name", f"Team {game.get('team_id_home')}"),
                    "abbrev": game.get("home_team_abbrev", f"T{game.get('team_id_home')}")
                },
                "away_team": {
                    "id": game.get("team_id_away", 0),
                    "name": game.get("away_team_name", f"Team {game.get('team_id_away')}"),
                    "abbrev": game.get("away_team_abbrev", f"T{game.get('team_id_away')}")
                },
                "home_score": game.get("pts_home"),
                "away_score": game.get("pts_away"),
                "season": game.get("season_id"),
                "season_type": game.get("season_type")
            }
        except Exception as e:
            print(f"❌ Ошибка получения матча по ID: {e}")
            return None

    def get_matches_by_team(self, team_id: int, limit: int = 50):
        """Получение матчей команды"""
        try:
            result = self.db.execute(
                text("""
                    SELECT 
                        g.*,
                        home.full_name as home_team_name,
                        home.abbreviation as home_team_abbrev,
                        away.full_name as away_team_name,
                        away.abbreviation as away_team_abbrev
                    FROM game g
                    LEFT JOIN team home ON g.team_id_home = home.id
                    LEFT JOIN team away ON g.team_id_away = away.id
                    WHERE g.team_id_home = :team_id OR g.team_id_away = :team_id
                    ORDER BY g.game_date DESC
                    LIMIT :limit
                """),
                {"team_id": team_id, "limit": limit}
            ).fetchall()

            matches = []
            for row in result:
                game = dict(row._mapping)
                matches.append({
                    "id": game.get("game_id"),
                    "date": game.get("game_date"),
                    "home_score": game.get("pts_home"),
                    "away_score": game.get("pts_away"),
                    "home_team": game.get("home_team_name"),
                    "away_team": game.get("away_team_name")
                })

            return matches
        except Exception as e:
            print(f"❌ Ошибка получения матчей команды: {e}")
            return []

    def create_match(self, match_data, user_id: int) -> Optional[Dict[str, Any]]:
        """Создание нового матча"""
        # Проверяем права доступа
        user_check = self.db.execute(
            text("SELECT role FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        ).fetchone()

        if not user_check or user_check[0] not in ['admin', 'operator']:
            raise PermissionError("Недостаточно прав для создания матча")

        try:
            # Генерируем ID для матча
            game_id = f"MANUAL_{datetime.now().strftime('%Y%m%d%H%M%S')}"

            self.db.execute(
                text("""
                    INSERT INTO game (
                        game_id, game_date, team_id_home, team_id_away,
                        season_type, min
                    ) VALUES (
                        :game_id, :game_date, :home_id, :away_id,
                        'Regular Season', 0
                    )
                """),
                {
                    "game_id": game_id,
                    "game_date": match_data.date,
                    "home_id": match_data.home_team_id,
                    "away_id": match_data.away_team_id
                }
            )
            self.db.commit()

            # Логирование
            self.db.execute(
                text("""
                    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
                    VALUES (:user_id, 'CREATE', 'Match', :match_id, :details, :created_at)
                """),
                {
                    "user_id": user_id,
                    "match_id": game_id,
                    "details": f"Created match: {match_data.home_team_id} vs {match_data.away_team_id}",
                    "created_at": datetime.utcnow()
                }
            )
            self.db.commit()

            return self.get_match_by_id(int(time.time()))  # Возвращаем созданный матч

        except Exception as e:
            print(f"❌ Ошибка создания матча: {e}")
            self.db.rollback()
            return None

    def update_match_result(self, match_id: int, home_score: int, away_score: int, user_id: int) -> Optional[
        Dict[str, Any]]:
        """Обновление результата матча"""
        # Проверяем права доступа
        user_check = self.db.execute(
            text("SELECT role FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        ).fetchone()

        if not user_check or user_check[0] not in ['admin', 'operator']:
            raise PermissionError("Недостаточно прав для обновления результата")

        try:
            # Определяем победителя
            wl_home = 'W' if home_score > away_score else 'L'
            wl_away = 'L' if home_score > away_score else 'W'

            self.db.execute(
                text("""
                    UPDATE game 
                    SET pts_home = :home_score, pts_away = :away_score,
                        wl_home = :wl_home, wl_away = :wl_away
                    WHERE game_id = :match_id OR game_id = :match_id_espn
                """),
                {
                    "home_score": home_score,
                    "away_score": away_score,
                    "wl_home": wl_home,
                    "wl_away": wl_away,
                    "match_id": str(match_id),
                    "match_id_espn": f"ESPN_{match_id}"
                }
            )
            self.db.commit()

            # Логирование
            self.db.execute(
                text("""
                    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
                    VALUES (:user_id, 'UPDATE_RESULT', 'Match', :match_id, :details, :created_at)
                """),
                {
                    "user_id": user_id,
                    "match_id": str(match_id),
                    "details": f"Updated result: {home_score}-{away_score}",
                    "created_at": datetime.utcnow()
                }
            )
            self.db.commit()

            return self.get_match_by_id(match_id)

        except Exception as e:
            print(f"❌ Ошибка обновления результата: {e}")
            self.db.rollback()
            return None

    def delete_match(self, match_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Удаление матча"""
        # Проверяем права доступа (только админ)
        user_check = self.db.execute(
            text("SELECT role FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        ).fetchone()

        if not user_check or user_check[0] != 'admin':
            raise PermissionError("Недостаточно прав для удаления матча")

        try:
            # Получаем информацию о матче перед удалением
            match = self.get_match_by_id(match_id)
            if not match:
                return None

            self.db.execute(
                text("DELETE FROM game WHERE game_id = :match_id OR game_id = :match_id_espn"),
                {"match_id": str(match_id), "match_id_espn": f"ESPN_{match_id}"}
            )
            self.db.commit()

            # Логирование
            self.db.execute(
                text("""
                    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
                    VALUES (:user_id, 'DELETE', 'Match', :match_id, :details, :created_at)
                """),
                {
                    "user_id": user_id,
                    "match_id": str(match_id),
                    "details": f"Deleted match: {match['home_team']['name']} vs {match['away_team']['name']}",
                    "created_at": datetime.utcnow()
                }
            )
            self.db.commit()

            return match

        except Exception as e:
            print(f"❌ Ошибка удаления матча: {e}")
            self.db.rollback()
            return None