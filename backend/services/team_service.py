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
        """Получение всех команд из таблицы team"""
        try:
            # Проверяем есть ли таблица team
            table_check = self.db.execute(
                text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team')")
            ).scalar()

            if not table_check:
                print("❌ Таблица team не найдена в PostgreSQL")
                return []

            # Получаем данные из таблицы team
            result = self.db.execute(
                text("""
                    SELECT 
                        t.id,
                        t.full_name as name,
                        t.abbreviation as abbrev,
                        t.full_name,
                        t.nickname,
                        t.city,
                        t.state,
                        t.year_founded as founded_year,
                        COALESCE(td.arena, t.city || ' Arena') as arena,
                        COALESCE(td.arenacapacity, 0) as arena_capacity,
                        COALESCE(td.headcoach, 'Unknown') as head_coach,
                        COALESCE(td.generalmanager, 'Unknown') as general_manager,
                        COALESCE(td.owner, 'Unknown') as owner,
                        -- Статистика из team_info_common (последний сезон)
                        (SELECT ti.team_conference FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as conference,
                        (SELECT ti.team_division FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as division,
                        (SELECT ti.w FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as wins,
                        (SELECT ti.l FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as losses,
                        (SELECT ti.pct FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as win_pct,
                        (SELECT ti.pts_pg FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as points_per_game,
                        (SELECT ti.opp_pts_pg FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as points_against,
                        (SELECT ti.reb_pg FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as rebounds_per_game,
                        (SELECT ti.ast_pg FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as assists_per_game
                    FROM team t
                    LEFT JOIN team_details td ON t.id = td.team_id
                    ORDER BY t.full_name
                    LIMIT :limit OFFSET :skip
                """),
                {"limit": limit, "skip": skip}
            ).fetchall()

            teams = []
            for row in result:
                team_data = dict(row._mapping)
                # Конвертируем названия конференций в ID (1 для Eastern, 2 для Western)
                conference_id = 1 if team_data.get('conference') == 'Eastern' else 2 if team_data.get(
                    'conference') == 'Western' else 0
                division_id = self._get_division_id(team_data.get('division'))

                teams.append({
                    "id": team_data["id"],
                    "name": team_data["name"],
                    "abbrev": team_data["abbrev"],
                    "full_name": team_data["full_name"],
                    "nickname": team_data.get("nickname", ""),
                    "city": team_data.get("city", ""),
                    "state": team_data.get("state", ""),
                    "arena": team_data.get("arena", f"{team_data['name']} Arena"),
                    "arena_capacity": team_data.get("arena_capacity", 0),
                    "founded_year": team_data.get("founded_year", 1970),
                    "head_coach": team_data.get("head_coach", "Unknown"),
                    "general_manager": team_data.get("general_manager", "Unknown"),
                    "owner": team_data.get("owner", "Unknown"),
                    "conference": team_data.get("conference", "Unknown"),
                    "conference_id": conference_id,
                    "division": team_data.get("division", "Unknown"),
                    "division_id": division_id,
                    "wins": team_data.get("wins", 0) or 0,
                    "losses": team_data.get("losses", 0) or 0,
                    "win_pct": float(team_data.get("win_pct", 0) or 0),
                    "points_per_game": float(team_data.get("points_per_game", 0) or 0),
                    "points_against": float(team_data.get("points_against", 0) or 0),
                    "rebounds_per_game": float(team_data.get("rebounds_per_game", 0) or 0),
                    "assists_per_game": float(team_data.get("assists_per_game", 0) or 0),
                    "championships": 0  # Временное значение, пока нет таблицы championships
                })

            return teams

        except Exception as e:
            print(f"❌ Ошибка получения команд: {e}")
            return []

    def _get_division_id(self, division_name: str) -> int:
        """Конвертирует название дивизиона в ID"""
        division_map = {
            'Atlantic': 1,
            'Central': 2,
            'Southeast': 3,
            'Northwest': 4,
            'Pacific': 5,
            'Southwest': 6
        }
        return division_map.get(division_name, 0)

    def get_team_by_id(self, team_id: int):
        """Получение команды по ID"""
        try:
            result = self.db.execute(
                text("""
                    SELECT 
                        t.id,
                        t.full_name as name,
                        t.abbreviation as abbrev,
                        t.full_name,
                        t.nickname,
                        t.city,
                        t.state,
                        t.year_founded as founded_year,
                        COALESCE(td.arena, t.city || ' Arena') as arena,
                        COALESCE(td.arenacapacity, 0) as arena_capacity,
                        COALESCE(td.headcoach, 'Unknown') as head_coach,
                        COALESCE(td.generalmanager, 'Unknown') as general_manager,
                        COALESCE(td.owner, 'Unknown') as owner,
                        -- Статистика из team_info_common (последний сезон)
                        (SELECT ti.team_conference FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as conference,
                        (SELECT ti.team_division FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as division,
                        (SELECT ti.w FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as wins,
                        (SELECT ti.l FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as losses,
                        (SELECT ti.pct FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as win_pct,
                        (SELECT ti.pts_pg FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as points_per_game,
                        (SELECT ti.opp_pts_pg FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as points_against,
                        (SELECT ti.reb_pg FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as rebounds_per_game,
                        (SELECT ti.ast_pg FROM team_info_common ti 
                         WHERE ti.team_id = t.id ORDER BY ti.season_id DESC LIMIT 1) as assists_per_game
                    FROM team t
                    LEFT JOIN team_details td ON t.id = td.team_id
                    WHERE t.id = :team_id
                """),
                {"team_id": team_id}
            ).fetchone()

            if result:
                team_data = dict(result._mapping)
                conference_id = 1 if team_data.get('conference') == 'Eastern' else 2 if team_data.get(
                    'conference') == 'Western' else 0
                division_id = self._get_division_id(team_data.get('division'))

                return {
                    "id": team_data["id"],
                    "name": team_data["name"],
                    "abbrev": team_data["abbrev"],
                    "full_name": team_data["full_name"],
                    "nickname": team_data.get("nickname", ""),
                    "city": team_data.get("city", ""),
                    "state": team_data.get("state", ""),
                    "arena": team_data.get("arena", f"{team_data['name']} Arena"),
                    "arena_capacity": team_data.get("arena_capacity", 0),
                    "founded_year": team_data.get("founded_year", 1970),
                    "head_coach": team_data.get("head_coach", "Unknown"),
                    "general_manager": team_data.get("general_manager", "Unknown"),
                    "owner": team_data.get("owner", "Unknown"),
                    "conference": team_data.get("conference", "Unknown"),
                    "conference_id": conference_id,
                    "division": team_data.get("division", "Unknown"),
                    "division_id": division_id,
                    "wins": team_data.get("wins", 0) or 0,
                    "losses": team_data.get("losses", 0) or 0,
                    "win_pct": float(team_data.get("win_pct", 0) or 0),
                    "points_per_game": float(team_data.get("points_per_game", 0) or 0),
                    "points_against": float(team_data.get("points_against", 0) or 0),
                    "rebounds_per_game": float(team_data.get("rebounds_per_game", 0) or 0),
                    "assists_per_game": float(team_data.get("assists_per_game", 0) or 0),
                    "championships": 0
                }

            return None

        except Exception as e:
            print(f"❌ Ошибка получения команды по ID {team_id}: {e}")
            return None

    def get_team_by_name(self, name: str):
        """Получение команды по названию"""
        try:
            result = self.db.execute(
                text("""
                    SELECT id, full_name as name
                    FROM team 
                    WHERE full_name ILIKE :name OR nickname ILIKE :name OR abbreviation ILIKE :name
                    LIMIT 1
                """),
                {"name": f"%{name}%"}
            ).fetchone()

            if result:
                team_data = dict(result._mapping)
                return {
                    "id": team_data["id"],
                    "name": team_data["name"]
                }
        except Exception as e:
            print(f"❌ Ошибка получения команды по названию: {e}")

        return None

    def get_team_stats_by_season(self, team_id: int, season_id: str = None):
        """Получение статистики команды за конкретный сезон"""
        try:
            query = """
                SELECT *
                FROM team_info_common
                WHERE team_id = :team_id
            """
            params = {"team_id": team_id}

            if season_id:
                query += " AND season_id = :season_id"
                params["season_id"] = season_id
            else:
                query += " ORDER BY season_id DESC LIMIT 1"

            result = self.db.execute(text(query), params).fetchone()

            if result:
                return dict(result._mapping)
        except Exception as e:
            print(f"❌ Ошибка получения статистики команды: {e}")

        return None

    def get_team_history(self, team_id: int):
        """Получение истории команды (прошлые названия)"""
        try:
            result = self.db.execute(
                text("""
                    SELECT *
                    FROM team_history
                    WHERE team_id = :team_id
                    ORDER BY year_founded
                """),
                {"team_id": team_id}
            ).fetchall()

            return [dict(row._mapping) for row in result]
        except Exception as e:
            print(f"❌ Ошибка получения истории команды: {e}")
            return []

    def create_team(self, team_data, user_id: int):
        """Создание новой команды"""
        try:
            # Проверяем права доступа
            user_check = self.db.execute(
                text("SELECT role FROM users WHERE id = :user_id"),
                {"user_id": user_id}
            ).fetchone()

            if not user_check or user_check[0] not in ['admin', 'operator']:
                raise PermissionError("Недостаточно прав для создания команды")

            result = self.db.execute(
                text("""
                    INSERT INTO team (
                        full_name, abbreviation, nickname, city, state, year_founded
                    ) VALUES (
                        :full_name, :abbrev, :nickname, :city, :state, :year_founded
                    ) RETURNING id
                """),
                {
                    "full_name": team_data.full_name,
                    "abbrev": team_data.abbrev,
                    "nickname": team_data.nickname or team_data.name,
                    "city": team_data.city or '',
                    "state": team_data.state or '',
                    "year_founded": team_data.founded_year or 1970
                }
            )
            self.db.commit()

            new_id = result.scalar()

            # Логирование в audit_logs
            self.db.execute(
                text("""
                    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
                    VALUES (:user_id, 'CREATE', 'Team', :team_id, :details, :created_at)
                """),
                {
                    "user_id": user_id,
                    "team_id": new_id,
                    "details": f"Created team: {team_data.full_name}",
                    "created_at": datetime.utcnow()
                }
            )
            self.db.commit()

            return self.get_team_by_id(new_id)

        except Exception as e:
            print(f"❌ Ошибка создания команды: {e}")
            self.db.rollback()
            return None

    def update_team(self, team_id: int, team_data, user_id: int):
        """Обновление команды"""
        try:
            # Проверяем права доступа
            user_check = self.db.execute(
                text("SELECT role FROM users WHERE id = :user_id"),
                {"user_id": user_id}
            ).fetchone()

            if not user_check or user_check[0] not in ['admin', 'operator']:
                raise PermissionError("Недостаточно прав для обновления команды")

            # Собираем поля для обновления
            update_fields = []
            params = {"team_id": team_id}

            updateable_fields = {
                'full_name': 'full_name',
                'abbrev': 'abbreviation',
                'nickname': 'nickname',
                'city': 'city',
                'state': 'state',
                'founded_year': 'year_founded'
            }

            for field, db_field in updateable_fields.items():
                value = getattr(team_data, field, None)
                if value is not None:
                    update_fields.append(f"{db_field} = :{field}")
                    params[field] = value

            if update_fields:
                query = f"""
                    UPDATE team 
                    SET {', '.join(update_fields)}
                    WHERE id = :team_id
                """
                self.db.execute(text(query), params)
                self.db.commit()

                # Логирование
                self.db.execute(
                    text("""
                        INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
                        VALUES (:user_id, 'UPDATE', 'Team', :team_id, :details, :created_at)
                    """),
                    {
                        "user_id": user_id,
                        "team_id": team_id,
                        "details": f"Updated team {team_id}",
                        "created_at": datetime.utcnow()
                    }
                )
                self.db.commit()

            return self.get_team_by_id(team_id)

        except Exception as e:
            print(f"❌ Ошибка обновления команды: {e}")
            self.db.rollback()
            return None

    def delete_team(self, team_id: int, user_id: int):
        """Удаление команды (только для админов)"""
        try:
            # Проверяем права доступа
            user_check = self.db.execute(
                text("SELECT role FROM users WHERE id = :user_id"),
                {"user_id": user_id}
            ).fetchone()

            if not user_check or user_check[0] != 'admin':
                raise PermissionError("Недостаточно прав для удаления команды")

            # Получаем информацию о команде перед удалением
            team = self.get_team_by_id(team_id)
            if not team:
                return None

            # Удаляем команду
            self.db.execute(
                text("DELETE FROM team WHERE id = :team_id"),
                {"team_id": team_id}
            )
            self.db.commit()

            # Логирование
            self.db.execute(
                text("""
                    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
                    VALUES (:user_id, 'DELETE', 'Team', :team_id, :details, :created_at)
                """),
                {
                    "user_id": user_id,
                    "team_id": team_id,
                    "details": f"Deleted team: {team['name']}",
                    "created_at": datetime.utcnow()
                }
            )
            self.db.commit()

            return team

        except Exception as e:
            print(f"❌ Ошибка удаления команды: {e}")
            self.db.rollback()
            return None