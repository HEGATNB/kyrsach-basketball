from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import schemas
import models
from middleware.auth import require_admin_or_operator, require_admin

router = APIRouter()

@router.get("/", response_model=List[schemas.PlayerResponse])
def get_players(
    team_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Player)
    if team_id:
        query = query.filter(models.Player.team_id == team_id)
    return query.all()

@router.get("/{player_id}", response_model=schemas.PlayerResponse)
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Игрок не найден")
    return player

@router.post("/", response_model=schemas.PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_player(
    player_data: schemas.PlayerCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    await require_admin_or_operator(request)
    
    db_player = models.Player(**player_data.dict())
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player
