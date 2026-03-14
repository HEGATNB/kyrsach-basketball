from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas

class TeamService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_teams(self, skip: int = 0, limit: int = 100) -> List[models.Team]:
        """Получение всех команд из БД"""
        return self.db.query(models.Team).offset(skip).limit(limit).all()

    def get_team_by_id(self, team_id: int) -> Optional[models.Team]:
        """Получение команды по ID"""
        return self.db.query(models.Team).filter(models.Team.id == team_id).first()

    def get_team_by_name(self, name: str) -> Optional[models.Team]:
        """Получение команды по названию"""
        return self.db.query(models.Team).filter(models.Team.name == name).first()

    def get_team_by_abbrev(self, abbrev: str) -> Optional[models.Team]:
        """Получение команды по аббревиатуре"""
        return self.db.query(models.Team).filter(models.Team.abbrev == abbrev).first()

    def create_team(self, team_data: schemas.TeamCreate, user_id: int) -> models.Team:
        """Создание новой команды"""
        db_team = models.Team(
            name=team_data.name,
            abbrev=team_data.abbrev,
            full_name=team_data.full_name,
            nickname=team_data.nickname,
            city=team_data.city,
            arena=team_data.arena,
            founded_year=team_data.founded_year,
            conference_id=team_data.conference_id,
            division_id=team_data.division_id
        )
        self.db.add(db_team)
        self.db.commit()
        self.db.refresh(db_team)
        return db_team

    def update_team(self, team_id: int, team_data: schemas.TeamUpdate, user_id: int) -> Optional[models.Team]:
        """Обновление команды"""
        db_team = self.get_team_by_id(team_id)
        if not db_team:
            return None

        update_data = team_data.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_team, key, value)
        
        self.db.commit()
        self.db.refresh(db_team)
        return db_team

    def delete_team(self, team_id: int, user_id: int) -> Optional[models.Team]:
        """Удаление команды"""
        db_team = self.get_team_by_id(team_id)
        if db_team:
            self.db.delete(db_team)
            self.db.commit()
        return db_team
