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
            query = "SELECT * FROM game"
            params = {}

            # Применяем фильтры
            if filters and filters.get("status"):
                if filters["status"] == "finished":
                    query += " WHERE wl_home IS NOT NULL"
                elif filters["status"] == "scheduled":
                    query += " WHERE wl_home IS NULL"

            query += " ORDER BY game_date DESC LIMIT :limit OFFSET :skip"
            params["limit"] = limit
            params["skip"] = skip

            result = self.db.execute(text(query), params).fetchall()

            matches = []
            for row in result:
                game = dict(row._mapping)

                # Извлекаем числовой ID из строки вида "ESPN_401810646"
                game_id_str = game.get("game_id", "0")
                try:
                    if "ESPN_" in game_id_str:
                        game_id = int(game_id_str.replace("ESPN_", ""))
                    else:
                        game_id = int(game_id_str)
                except:
                    continue  # Пропускаем если ID не конвертируется

                # Определяем статус матча
                has_score = game.get("pts_home") is not None and game.get("pts_away") is not None
                status = "finished" if has_score else "scheduled"

                match = {
                    "id": game_id,
                    "date": game.get("game_date", ""),
                    "status": status,
                    "home_team_id": game.get("team_id_home", 0),
                    "away_team_id": game.get("team_id_away", 0),
                    "home_score": game.get("pts_home"),
                    "away_score": game.get("pts_away"),
                    "created_by_id": 1,  # Значение по умолчанию
                    "created_at": game.get("game_date", "")
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
                text("SELECT * FROM game WHERE game_id = :id1 OR game_id = :id2"),
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
                "home_score": game.get("pts_home"),
                "away_score": game.get("pts_away"),
                "created_by_id": 1,
                "created_at": game.get("game_date", "")
            }
        except Exception as e:
            print(f"❌ Ошибка получения матча по ID: {e}")
            return None

    def create_match(self, match_data, user_id: int) -> Dict[str, Any]:
        """Создание нового матча"""
        # Здесь должна быть вставка в БД
        # Для простоты возвращаем заглушку
        return {
            "id": 0,
            "date": match_data.date.isoformat() if hasattr(match_data, 'date') else str(match_data.get('date')),
            "status": "scheduled",
            "home_team_id": match_data.home_team_id,
            "away_team_id": match_data.away_team_id,
            "home_score": None,
            "away_score": None,
            "created_by_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        }

    def update_match_result(self, match_id: int, home_score: int, away_score: int, user_id: int) -> Optional[
        Dict[str, Any]]:
        """Обновление результата матча"""
        # Здесь должно быть обновление в БД
        match = self.get_match_by_id(match_id)
        if not match:
            return None

        match["home_score"] = home_score
        match["away_score"] = away_score
        match["status"] = "finished"
        return match

    def delete_match(self, match_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Удаление матча"""
        # Здесь должно быть удаление из БД
        match = self.get_match_by_id(match_id)
        return match