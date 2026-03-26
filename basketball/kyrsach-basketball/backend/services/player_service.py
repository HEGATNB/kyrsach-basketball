# services/player_service.py
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any


class PlayerService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_players(
            self,
            team_abbrev: Optional[str] = None,
            season: Optional[str] = None,
            search: Optional[str] = None,
            min_games: int = 5,
            sort_by: str = 'pts',
            sort_order: str = 'desc',
            skip: int = 0,
            limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Получение всех игроков из таблицы players
        """
        try:
            # Сначала проверим, какие колонки реально есть в таблице
            check_query = """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'players'
            """
            columns = self.db.execute(text(check_query)).fetchall()
            existing_columns = [col[0] for col in columns]
            print(f"✅ Колонки в таблице players: {existing_columns}")

            # Определяем, как называется колонка с ID
            id_column = 'id' if 'id' in existing_columns else 'unnamed_0'

            query = f"""
                SELECT 
                    {id_column} as id,
                    player_name,
                    team_abbreviation,
                    age,
                    player_height,
                    player_weight,
                    college,
                    country,
                    draft_year,
                    draft_round,
                    draft_number,
                    gp as games_played,
                    pts as points_per_game,
                    reb as rebounds_per_game,
                    ast as assists_per_game,
                    net_rating,
                    oreb_pct,
                    dreb_pct,
                    usg_pct as usage_rate,
                    ts_pct as true_shooting,
                    ast_pct as assist_percentage,
                    season
                FROM players
                WHERE gp >= :min_games
            """

            params = {"min_games": min_games}

            if team_abbrev:
                query += " AND team_abbreviation = :team_abbrev"
                params["team_abbrev"] = team_abbrev.upper()

            if season:
                query += " AND season = :season"
                params["season"] = season

            if search:
                query += " AND player_name ILIKE :search"
                params["search"] = f"%{search}%"

            # Валидация сортировки
            valid_sort_columns = ['pts', 'reb', 'ast', 'player_name', 'gp', 'season']
            if sort_by not in valid_sort_columns:
                sort_by = 'pts'

            sort_direction = 'DESC' if sort_order.lower() == 'desc' else 'ASC'

            query += f" ORDER BY {sort_by} {sort_direction} NULLS LAST"
            query += " LIMIT :limit OFFSET :skip"

            params["limit"] = limit
            params["skip"] = skip

            print(f"🔍 Выполняем запрос players с параметрами: {params}")
            result = self.db.execute(text(query), params).fetchall()
            print(f"✅ Найдено {len(result)} игроков")

            players = []
            for row in result:
                player_data = dict(row._mapping)

                # Разбиваем имя на части
                full_name = player_data.get("player_name", "")
                name_parts = full_name.split(" ")
                first_name = name_parts[0] if name_parts else ""
                last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

                players.append({
                    "id": player_data.get("id"),
                    "first_name": first_name,
                    "last_name": last_name,
                    "full_name": full_name,
                    "team_abbrev": player_data.get("team_abbreviation"),
                    "age": float(player_data.get("age") or 0),
                    "height": self._format_height(player_data.get("player_height")),
                    "weight": self._format_weight(player_data.get("player_weight")),
                    "college": player_data.get("college"),
                    "country": player_data.get("country"),

                    # Статистика
                    "games_played": player_data.get("games_played"),
                    "points_per_game": float(player_data.get("points_per_game") or 0),
                    "rebounds_per_game": float(player_data.get("rebounds_per_game") or 0),
                    "assists_per_game": float(player_data.get("assists_per_game") or 0),

                    # Продвинутая статистика
                    "net_rating": float(player_data.get("net_rating") or 0),
                    "offensive_rebound_pct": float(player_data.get("oreb_pct") or 0),
                    "defensive_rebound_pct": float(player_data.get("dreb_pct") or 0),
                    "usage_rate": float(player_data.get("usage_rate") or 0),
                    "true_shooting": float(player_data.get("true_shooting") or 0),
                    "assist_percentage": float(player_data.get("assist_percentage") or 0),

                    # Информация о драфте
                    "draft_year": player_data.get("draft_year"),
                    "draft_round": player_data.get("draft_round"),
                    "draft_number": player_data.get("draft_number"),

                    "season": player_data.get("season")
                })

            return players

        except Exception as e:
            print(f"❌ Ошибка получения игроков: {e}")
            import traceback
            traceback.print_exc()
            return []

    def get_player_by_id(self, player_id: int) -> Optional[Dict[str, Any]]:
        """Получение игрока по ID"""
        try:
            # Сначала проверим, какие колонки реально есть в таблице
            check_query = """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'players'
            """
            columns = self.db.execute(text(check_query)).fetchall()
            existing_columns = [col[0] for col in columns]

            # Определяем, как называется колонка с ID
            id_column = 'id' if 'id' in existing_columns else 'unnamed_0'

            query = f"""
                SELECT 
                    {id_column} as id,
                    player_name,
                    team_abbreviation,
                    age,
                    player_height,
                    player_weight,
                    college,
                    country,
                    draft_year,
                    draft_round,
                    draft_number,
                    gp as games_played,
                    pts as points_per_game,
                    reb as rebounds_per_game,
                    ast as assists_per_game,
                    net_rating,
                    oreb_pct,
                    dreb_pct,
                    usg_pct as usage_rate,
                    ts_pct as true_shooting,
                    ast_pct as assist_percentage,
                    season
                FROM players
                WHERE {id_column} = :player_id
            """

            result = self.db.execute(text(query), {"player_id": player_id}).fetchone()

            if not result:
                return None

            player_data = dict(result._mapping)

            # Разбиваем имя на части
            full_name = player_data.get("player_name", "")
            name_parts = full_name.split(" ")
            first_name = name_parts[0] if name_parts else ""
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

            return {
                "id": player_data.get("id"),
                "first_name": first_name,
                "last_name": last_name,
                "full_name": full_name,
                "team_abbrev": player_data.get("team_abbreviation"),
                "age": float(player_data.get("age") or 0),
                "height": self._format_height(player_data.get("player_height")),
                "weight": self._format_weight(player_data.get("player_weight")),
                "college": player_data.get("college"),
                "country": player_data.get("country"),

                # Статистика
                "games_played": player_data.get("games_played"),
                "points_per_game": float(player_data.get("points_per_game") or 0),
                "rebounds_per_game": float(player_data.get("rebounds_per_game") or 0),
                "assists_per_game": float(player_data.get("assists_per_game") or 0),

                # Продвинутая статистика
                "net_rating": float(player_data.get("net_rating") or 0),
                "offensive_rebound_pct": float(player_data.get("oreb_pct") or 0),
                "defensive_rebound_pct": float(player_data.get("dreb_pct") or 0),
                "usage_rate": float(player_data.get("usage_rate") or 0),
                "true_shooting": float(player_data.get("true_shooting") or 0),
                "assist_percentage": float(player_data.get("assist_percentage") or 0),

                # Информация о драфте
                "draft_year": player_data.get("draft_year"),
                "draft_round": player_data.get("draft_round"),
                "draft_number": player_data.get("draft_number"),

                "season": player_data.get("season")
            }

        except Exception as e:
            print(f"❌ Ошибка получения игрока по ID: {e}")
            return None

    def get_players_by_team(self, team_abbrev: str) -> List[Dict[str, Any]]:
        """Получение игроков команды"""
        return self.get_all_players(team_abbrev=team_abbrev)

    def get_seasons(self) -> List[str]:
        """Получение списка всех сезонов"""
        try:
            result = self.db.execute(
                text("SELECT DISTINCT season FROM players ORDER BY season DESC")
            ).fetchall()
            return [row[0] for row in result]
        except Exception as e:
            print(f"❌ Ошибка получения сезонов: {e}")
            return []

    def get_top_players(
            self,
            category: str = 'pts',
            min_games: int = 10,
            limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Получение топ-игроков по категории"""
        valid_categories = ['pts', 'reb', 'ast', 'net_rating']
        if category not in valid_categories:
            category = 'pts'

        try:
            # Сначала проверим, какие колонки реально есть в таблице
            check_query = """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'players'
            """
            columns = self.db.execute(text(check_query)).fetchall()
            existing_columns = [col[0] for col in columns]

            # Определяем, как называется колонка с ID
            id_column = 'id' if 'id' in existing_columns else 'unnamed_0'

            query = f"""
                SELECT 
                    {id_column} as id,
                    player_name,
                    team_abbreviation,
                    gp,
                    {category} as value,
                    pts,
                    reb,
                    ast,
                    season
                FROM players
                WHERE gp >= :min_games
                ORDER BY {category} DESC NULLS LAST
                LIMIT :limit
            """

            result = self.db.execute(
                text(query),
                {"min_games": min_games, "limit": limit}
            ).fetchall()

            players = []
            for row in result:
                player_data = dict(row._mapping)
                players.append({
                    "id": player_data.get("id"),
                    "player_name": player_data.get("player_name"),
                    "team_abbrev": player_data.get("team_abbreviation"),
                    "games_played": player_data.get("gp"),
                    "value": float(player_data.get("value") or 0),
                    "points_per_game": float(player_data.get("pts") or 0),
                    "rebounds_per_game": float(player_data.get("reb") or 0),
                    "assists_per_game": float(player_data.get("ast") or 0),
                    "season": player_data.get("season")
                })

            return players

        except Exception as e:
            print(f"❌ Ошибка получения топ-игроков: {e}")
            return []

    def _format_height(self, height_cm: Optional[float]) -> Optional[str]:
        """Форматирует рост в сантиметрах"""
        if not height_cm:
            return None
        return f"{int(height_cm)} см"

    def _format_weight(self, weight_kg: Optional[float]) -> Optional[str]:
        """Форматирует вес в килограммах"""
        if not weight_kg:
            return None
        return f"{int(weight_kg)} кг"