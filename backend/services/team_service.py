from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import List, Optional, Dict


class TeamService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_teams(self, skip: int = 0, limit: int = 100):
        """Получение всех команд"""
        try:
            query = """
                WITH team_stats AS (
                    SELECT DISTINCT ON (team_id)
                        team_id,
                        season_id,
                        team_conference,
                        team_division,
                        w,
                        l,
                        pct,
                        pts_pg,
                        opp_pts_pg,
                        reb_pg,
                        ast_pg
                    FROM team_info_common
                    ORDER BY team_id, season_id DESC
                )
                SELECT 
                    t.id,
                    t.full_name as name,
                    t.abbreviation as abbrev,
                    t.full_name,
                    t.nickname,
                    t.city,
                    t.state,
                    t.year_founded as founded_year,
                    td.arena,
                    td.arenacapacity as arena_capacity,
                    td.headcoach as head_coach,
                    td.generalmanager as general_manager,
                    td.owner,
                    ts.team_conference as conference,
                    ts.team_division as division,
                    ts.w as wins,
                    ts.l as losses,
                    ts.pct as win_pct,
                    ts.pts_pg as points_per_game,
                    ts.opp_pts_pg as points_against,
                    ts.reb_pg as rebounds_per_game,
                    ts.ast_pg as assists_per_game
                FROM team t
                LEFT JOIN team_details td ON t.id = td.team_id
                LEFT JOIN team_stats ts ON t.id = ts.team_id
                ORDER BY t.full_name
                LIMIT :limit OFFSET :skip
            """

            result = self.db.execute(text(query), {"limit": limit, "skip": skip}).fetchall()

            teams = []
            for row in result:
                team_data = dict(row._mapping)

                # Определяем ID конференции
                conference = team_data.get('conference')
                conference_id = 0
                if conference == 'Eastern':
                    conference_id = 1
                elif conference == 'Western':
                    conference_id = 2

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
                    "conference": conference,
                    "conference_id": conference_id,
                    "division": team_data.get("division", "Unknown"),
                    "wins": team_data.get("wins", 0) or 0,
                    "losses": team_data.get("losses", 0) or 0,
                    "win_pct": float(team_data.get("win_pct", 0) or 0),
                    "points_per_game": float(team_data.get("points_per_game", 0) or 0),
                    "points_against": float(team_data.get("points_against", 0) or 0),
                    "rebounds_per_game": float(team_data.get("rebounds_per_game", 0) or 0),
                    "assists_per_game": float(team_data.get("assists_per_game", 0) or 0),
                    "championships": 0
                })

            return teams

        except Exception as e:
            print(f"❌ Ошибка получения команд: {e}")
            return []