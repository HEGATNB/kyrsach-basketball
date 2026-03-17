# services/match_service.py
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
            # Используем данные напрямую из таблицы game
            query = """
                SELECT 
                    g.season_id,
                    g.game_id,
                    g.game_date,
                    g.team_id_home,
                    g.team_id_away,
                    g.pts_home,
                    g.pts_away,
                    g.wl_home,
                    g.wl_away,
                    g.season_type,
                    g.team_abbreviation_home as home_team_abbrev,
                    g.team_name_home as home_team_name,
                    g.team_abbreviation_away as away_team_abbrev,
                    g.team_name_away as away_team_name
                FROM game g
                WHERE 1=1
            """

            where_clauses = []
            params = {}

            if filters and filters.get("status"):
                if filters["status"] == "finished":
                    where_clauses.append("g.wl_home IS NOT NULL")
                elif filters["status"] == "scheduled":
                    where_clauses.append("g.wl_home IS NULL")

            if where_clauses:
                query += " AND " + " AND ".join(where_clauses)

            query += " ORDER BY g.game_date DESC NULLS LAST LIMIT :limit OFFSET :skip"
            params["limit"] = limit
            params["skip"] = skip

            print(f"🔍 Выполняем запрос матчей с параметрами: {params}")
            result = self.db.execute(text(query), params).fetchall()
            print(f"✅ Найдено {len(result)} матчей")

            matches = []
            for row in result:
                game = dict(row._mapping)

                # Определяем статус
                has_score = game.get("pts_home") is not None and game.get("pts_away") is not None
                status = "finished" if has_score else "scheduled"

                # Форматируем дату из текстового поля
                game_date = game.get("game_date")
                date_str = None

                if game_date:
                    try:
                        # Пробуем разные форматы даты
                        if 'T' in game_date:
                            # ISO формат
                            date_obj = datetime.fromisoformat(game_date.replace('Z', '+00:00'))
                        elif ' ' in game_date:
                            # Формат "1946-11-01 00:00:00"
                            date_obj = datetime.strptime(game_date, "%Y-%m-%d %H:%M:%S")
                        else:
                            # Только дата
                            date_obj = datetime.strptime(game_date, "%Y-%m-%d")

                        # Конвертируем в ISO формат для фронтенда
                        date_str = date_obj.isoformat()
                    except Exception as e:
                        print(f"⚠️ Ошибка парсинга даты '{game_date}': {e}")
                        date_str = game_date

                # Генерируем уникальный ID для матча
                # Используем game_id так как он уникальный
                try:
                    match_id = int(str(game.get('game_id')).replace('-', '')[:8])
                except:
                    match_id = abs(hash(f"{game.get('game_id')}_{game.get('season_id')}")) % (10 ** 8)

                # Получаем названия команд
                home_team_name = game.get("home_team_name", "Unknown Team")
                away_team_name = game.get("away_team_name", "Unknown Team")
                home_team_abbrev = game.get("home_team_abbrev", "???")
                away_team_abbrev = game.get("away_team_abbrev", "???")

                match = {
                    "id": match_id,
                    "game_id": game.get("game_id"),
                    "date": date_str,
                    "status": status,
                    "home_team_id": int(float(game.get("team_id_home"))) if game.get("team_id_home") else 0,
                    "away_team_id": int(float(game.get("team_id_away"))) if game.get("team_id_away") else 0,
                    "home_team": {
                        "id": int(float(game.get("team_id_home"))) if game.get("team_id_home") else 0,
                        "name": home_team_name,
                        "abbrev": home_team_abbrev
                    },
                    "away_team": {
                        "id": int(float(game.get("team_id_away"))) if game.get("team_id_away") else 0,
                        "name": away_team_name,
                        "abbrev": away_team_abbrev
                    },
                    "home_score": int(float(game.get("pts_home"))) if game.get("pts_home") is not None else None,
                    "away_score": int(float(game.get("pts_away"))) if game.get("pts_away") is not None else None,
                    "season": game.get("season_id"),
                    "season_type": game.get("season_type")
                }
                matches.append(match)

            return matches

        except Exception as e:
            print(f"❌ Ошибка получения матчей: {e}")
            import traceback
            traceback.print_exc()
            return []

    def get_match_by_id(self, match_id: int) -> Optional[Dict[str, Any]]:
        """Получение матча по ID"""
        try:
            # Получаем конкретный матч по ID
            query = """
                SELECT 
                    g.season_id,
                    g.game_id,
                    g.game_date,
                    g.team_id_home,
                    g.team_id_away,
                    g.pts_home,
                    g.pts_away,
                    g.wl_home,
                    g.wl_away,
                    g.season_type,
                    g.team_abbreviation_home as home_team_abbrev,
                    g.team_name_home as home_team_name,
                    g.team_abbreviation_away as away_team_abbrev,
                    g.team_name_away as away_team_name
                FROM game g
                WHERE 1=1
            """

            # Так как у нас нет прямого соответствия, получаем все и фильтруем
            matches = self.get_all_matches(limit=10000)
            for match in matches:
                if match["id"] == match_id:
                    return match
            return None

        except Exception as e:
            print(f"❌ Ошибка получения матча по ID: {e}")
            return None

    def create_match(self, match_data, user_id: int) -> Dict[str, Any]:
        """Создание нового матча"""
        raise NotImplementedError("Метод create_match еще не реализован")

    def update_match_result(self, match_id: int, home_score: int, away_score: int, user_id: int) -> Dict[str, Any]:
        """Обновление результата матча"""
        raise NotImplementedError("Метод update_match_result еще не реализован")

    def delete_match(self, match_id: int, user_id: int) -> Dict[str, Any]:
        """Удаление матча"""
        raise NotImplementedError("Метод delete_match еще не реализован")