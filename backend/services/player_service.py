from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
import re


class PlayerService:
    def __init__(self, db: Session):
        self.db = db

    def _convert_height(self, height_str: str) -> Optional[str]:
        """Конвертирует рост из формата '6-9' в сантиметры"""
        if not height_str or height_str == '':
            return None

        try:
            # Формат "6-9" (футы-дюймы)
            parts = height_str.split('-')
            if len(parts) == 2:
                feet = int(parts[0])
                inches = int(parts[1])
                total_inches = feet * 12 + inches
                cm = total_inches * 2.54
                return f"{round(cm)} cm"
        except:
            pass

        return height_str

    def _convert_weight(self, weight_str: str) -> Optional[str]:
        """Конвертирует вес из фунтов в килограммы"""
        if not weight_str or weight_str == '':
            return None

        try:
            lbs = float(weight_str)
            kg = round(lbs * 0.453592, 1)
            return f"{kg} kg"
        except:
            return weight_str

    def get_all_players(self, team_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """Получение всех игроков"""
        try:
            query = """
                SELECT 
                    cpi.person_id as id,
                    cpi.first_name,
                    cpi.last_name,
                    cpi.display_first_last as full_name,
                    cpi.jersey as number,
                    cpi.position,
                    cpi.birthdate,
                    cpi.country,
                    cpi.team_id,
                    cpi.team_abbreviation as team_abbrev,
                    cpi.team_name,
                    cpi.team_city,
                    cpi.season_exp as experience,
                    cpi.from_year,
                    cpi.to_year,
                    cpi.school,
                    cpi.height,
                    cpi.weight,
                    -- Статистика из player_stats (последний сезон)
                    ps.season,
                    ps.player_height,
                    ps.player_weight,
                    ps.games_played,
                    ps.pts as total_points,
                    ps.reb as total_rebounds,
                    ps.ast as total_assists,
                    ps.minutes as total_minutes,
                    ps.oreb_pct,
                    ps.dreb_pct,
                    ps.usg_pct,
                    ps.ts_pct,
                    ps.ast_pct,
                    ps.net_rating
                FROM common_player_info cpi
                LEFT JOIN LATERAL (
                    SELECT * FROM player_stats ps
                    WHERE ps.player_id = cpi.person_id::text
                    ORDER BY ps.season DESC
                    LIMIT 1
                ) ps ON true
                WHERE 1=1
            """
            params = {}

            if team_id:
                query += " AND cpi.team_id = :team_id"
                params["team_id"] = str(team_id)

            query += " ORDER BY cpi.last_name, cpi.first_name LIMIT :limit OFFSET :skip"
            params["limit"] = limit
            params["skip"] = skip

            result = self.db.execute(text(query), params).fetchall()

            players = []
            for row in result:
                player_data = dict(row._mapping)

                # Получаем данные
                games_played = player_data.get("games_played")
                if games_played is None or games_played == 0:
                    games_played = 1

                # Рассчитываем средние показатели
                total_points = player_data.get("total_points") or 0
                total_rebounds = player_data.get("total_rebounds") or 0
                total_assists = player_data.get("total_assists") or 0
                total_minutes = player_data.get("total_minutes") or 0

                points_per_game = round(total_points / games_played, 1)
                rebounds_per_game = round(total_rebounds / games_played, 1)
                assists_per_game = round(total_assists / games_played, 1)
                minutes_per_game = round(total_minutes / games_played, 1)

                # Конвертируем рост и вес
                height = self._convert_height(player_data.get("height"))
                weight = self._convert_weight(player_data.get("weight"))

                players.append({
                    "id": int(player_data.get("id", 0)),
                    "first_name": player_data.get("first_name", ""),
                    "last_name": player_data.get("last_name", ""),
                    "full_name": player_data.get("full_name", ""),
                    "number": player_data.get("number"),
                    "position": player_data.get("position"),
                    "height": height or player_data.get("player_height"),
                    "weight": weight or player_data.get("player_weight"),
                    "birth_date": player_data.get("birthdate"),
                    "country": player_data.get("country"),
                    "team_id": int(player_data.get("team_id")) if player_data.get("team_id") else None,
                    "team_abbrev": player_data.get("team_abbrev"),
                    "team_name": player_data.get("team_name"),
                    "team_city": player_data.get("team_city"),
                    "experience": player_data.get("experience"),
                    "from_year": player_data.get("from_year"),
                    "to_year": player_data.get("to_year"),
                    "school": player_data.get("school"),
                    "season": player_data.get("season"),
                    "points_per_game": points_per_game,
                    "rebounds_per_game": rebounds_per_game,
                    "assists_per_game": assists_per_game,
                    "minutes_per_game": minutes_per_game,
                    "games_played": games_played if games_played != 1 else None,
                    "usage_rate": player_data.get("usg_pct"),
                    "true_shooting": player_data.get("ts_pct"),
                    "net_rating": player_data.get("net_rating")
                })

            return players

        except Exception as e:
            print(f"❌ Ошибка получения игроков: {e}")
            import traceback
            traceback.print_exc()
            return []