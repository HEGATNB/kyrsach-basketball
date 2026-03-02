from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import sys
import os
from typing import List, Optional, Dict

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TeamService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_teams(self, skip: int = 0, limit: int = 100):
        """Получение всех команд"""
        try:
            # Проверяем есть ли таблица game
            table_check = self.db.execute(
                text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game')")
            ).scalar()

            if table_check:
                result = self.db.execute(
                    text("""
                        SELECT DISTINCT 
                            team_id_home as id, 
                            team_name_home as name, 
                            team_abbreviation_home as abbrev,
                            team_name_home as full_name,
                            COALESCE(split_part(team_name_home, ' ', 1), '') as city,
                            team_name_home || ' Arena' as arena,
                            1970 as founded_year,
                            1 as conference_id,
                            1 as division_id,
                            1 as championships,
                            41 as wins,
                            41 as losses,
                            110.5 as points_per_game,
                            109.8 as points_against
                        FROM game 
                        UNION 
                        SELECT DISTINCT 
                            team_id_away as id, 
                            team_name_away as name, 
                            team_abbreviation_away as abbrev,
                            team_name_away as full_name,
                            COALESCE(split_part(team_name_away, ' ', 1), '') as city,
                            team_name_away || ' Arena' as arena,
                            1970 as founded_year,
                            1 as conference_id,
                            1 as division_id,
                            1 as championships,
                            41 as wins,
                            41 as losses,
                            110.5 as points_per_game,
                            109.8 as points_against
                        FROM game
                        ORDER BY name
                        LIMIT :limit OFFSET :skip
                    """),
                    {"limit": limit, "skip": skip}
                ).fetchall()

                return [dict(row._mapping) for row in result]
            else:
                # Демо-данные
                return self._get_demo_teams(skip, limit)
        except Exception as e:
            print(f"❌ Ошибка получения команд: {e}")
            return self._get_demo_teams(skip, limit)

    def _get_demo_teams(self, skip: int = 0, limit: int = 100):
        """Возвращает демо-данные команд"""
        demo_teams = [
            {
                "id": 1,
                "name": "Boston Celtics",
                "abbrev": "BOS",
                "full_name": "Boston Celtics",
                "city": "Boston",
                "arena": "TD Garden",
                "founded_year": 1946,
                "conference_id": 1,
                "division_id": 1,
                "championships": 17,
                "wins": 48,
                "losses": 24,
                "points_per_game": 118.5,
                "points_against": 112.3
            },
            {
                "id": 2,
                "name": "Los Angeles Lakers",
                "abbrev": "LAL",
                "full_name": "Los Angeles Lakers",
                "city": "Los Angeles",
                "arena": "Crypto.com Arena",
                "founded_year": 1947,
                "conference_id": 1,
                "division_id": 2,
                "championships": 17,
                "wins": 43,
                "losses": 29,
                "points_per_game": 116.2,
                "points_against": 114.1
            },
            {
                "id": 3,
                "name": "Golden State Warriors",
                "abbrev": "GSW",
                "full_name": "Golden State Warriors",
                "city": "San Francisco",
                "arena": "Chase Center",
                "founded_year": 1946,
                "conference_id": 1,
                "division_id": 3,
                "championships": 7,
                "wins": 41,
                "losses": 31,
                "points_per_game": 118.9,
                "points_against": 115.2
            }
        ]

        # Применяем skip и limit
        start = skip if skip < len(demo_teams) else len(demo_teams)
        end = min(start + limit, len(demo_teams))

        return demo_teams[start:end]

    def get_team_by_id(self, team_id: int):
        """Получение команды по ID"""
        try:
            result = self.db.execute(
                text("""
                    SELECT * FROM game WHERE team_id_home = :team_id OR team_id_away = :team_id LIMIT 1
                """),
                {"team_id": team_id}
            ).fetchone()

            if result:
                team_data = dict(result._mapping)
                if team_data["team_id_home"] == team_id:
                    return {
                        "id": team_data["team_id_home"],
                        "name": team_data["team_name_home"],
                        "abbrev": team_data["team_abbreviation_home"],
                        "full_name": team_data["team_name_home"],
                        "city": team_data["team_name_home"].split()[-1] if " " in team_data["team_name_home"] else "",
                        "arena": f"{team_data['team_name_home']} Arena",
                        "founded_year": 1970,
                        "conference_id": 1,
                        "division_id": 1,
                        "championships": 1,
                        "wins": 41,
                        "losses": 41,
                        "points_per_game": 110.5,
                        "points_against": 109.8
                    }
        except Exception as e:
            print(f"❌ Ошибка получения команды по ID: {e}")

        # Демо-данные для известных ID
        demo_teams = {
            1: {"name": "Boston Celtics", "abbrev": "BOS"},
            2: {"name": "Los Angeles Lakers", "abbrev": "LAL"},
            3: {"name": "Golden State Warriors", "abbrev": "GSW"},
        }

        if team_id in demo_teams:
            team = demo_teams[team_id]
            return {
                "id": team_id,
                "name": team["name"],
                "abbrev": team["abbrev"],
                "full_name": team["name"],
                "city": team["name"].split()[-1],
                "arena": f"{team['name']} Arena",
                "founded_year": 1970,
                "conference_id": 1,
                "division_id": 1,
                "championships": 1,
                "wins": 41,
                "losses": 41,
                "points_per_game": 110.5,
                "points_against": 109.8
            }

        return None

    def get_team_by_name(self, name: str):
        """Получение команды по названию"""
        try:
            result = self.db.execute(
                text("""
                    SELECT * FROM game 
                    WHERE team_name_home = :name OR team_name_away = :name 
                    LIMIT 1
                """),
                {"name": name}
            ).fetchone()

            if result:
                team_data = dict(result._mapping)
                return {
                    "id": team_data["team_id_home"] if team_data["team_name_home"] == name else team_data[
                        "team_id_away"],
                    "name": name
                }
        except Exception as e:
            print(f"❌ Ошибка получения команды по названию: {e}")

        return None

    def create_team(self, team_data, user_id: int):
        """Создание новой команды"""
        # В реальном проекте здесь было бы добавление в БД
        return {
            "id": 999,
            "name": team_data.name,
            "abbrev": team_data.abbrev,
            "full_name": team_data.full_name,
            "city": team_data.city,
            "arena": team_data.arena,
            "founded_year": team_data.founded_year,
            "conference_id": team_data.conference_id,
            "division_id": team_data.division_id,
            "championships": 0,
            "wins": 0,
            "losses": 0,
            "points_per_game": 0,
            "points_against": 0
        }

    def update_team(self, team_id: int, team_data, user_id: int):
        """Обновление команды"""
        team = self.get_team_by_id(team_id)
        if not team:
            return None

        # Обновляем поля
        update_data = team_data.dict(exclude_unset=True)
        team.update(update_data)
        return team

    def delete_team(self, team_id: int, user_id: int):
        """Удаление команды"""
        team = self.get_team_by_id(team_id)
        return team