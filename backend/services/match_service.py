from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import List, Optional, Dict, Any
import models
import schemas

class MatchService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_matches(self, filters: Dict = None, skip: int = 0, limit: int = 100) -> List[models.Match]:
        """Получение всех матчей с фильтрацией и присоединенными командами"""
        query = self.db.query(models.Match).options(
            joinedload(models.Match.home_team),
            joinedload(models.Match.away_team)
        )
        
        if filters:
            if filters.get("status"):
                query = query.filter(models.Match.status == filters["status"])
            if filters.get("team_id"):
                tid = filters["team_id"]
                query = query.filter((models.Match.home_team_id == tid) | (models.Match.away_team_id == tid))
        
        return query.order_by(models.Match.date.desc()).offset(skip).limit(limit).all()

    def get_match_by_id(self, match_id: int) -> Optional[models.Match]:
        """Получение матча по ID с присоединенными командами"""
        return self.db.query(models.Match).options(
            joinedload(models.Match.home_team),
            joinedload(models.Match.away_team)
        ).filter(models.Match.id == match_id).first()

    def create_match(self, match_data: schemas.MatchCreate, user_id: int) -> models.Match:
        """Создание нового матча"""
        db_match = models.Match(
            date=match_data.date,
            status=match_data.status,
            home_team_id=match_data.home_team_id,
            away_team_id=match_data.away_team_id,
            created_by_id=user_id
        )
        self.db.add(db_match)
        self.db.commit()
        self.db.refresh(db_match)
        return db_match

    def update_match_result(self, match_id: int, home_score: int, away_score: int, user_id: int) -> Optional[models.Match]:
        """Обновление результата матча"""
        db_match = self.get_match_by_id(match_id)
        if not db_match:
            return None

        db_match.home_score = home_score
        db_match.away_score = away_score
        db_match.status = "finished"
        
        self.db.commit()
        self.db.refresh(db_match)
        return db_match

    def delete_match(self, match_id: int, user_id: int) -> Optional[models.Match]:
        """Удаление матча"""
        db_match = self.get_match_by_id(match_id)
        if db_match:
            self.db.delete(db_match)
            self.db.commit()
        return db_match
