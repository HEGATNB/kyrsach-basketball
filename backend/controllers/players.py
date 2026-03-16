from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from database import get_db
from services.player_service import PlayerService
import schemas

# Настройка логирования
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[schemas.PlayerResponse])
async def get_all_players(
        team_id: Optional[int] = Query(None, description="Фильтр по ID команды"),
        skip: int = Query(0, ge=0, description="Сколько пропустить"),
        limit: int = Query(100, ge=1, le=500, description="Сколько вернуть"),
        db: Session = Depends(get_db)
):
    """Получение списка всех игроков со статистикой из player_stats"""
    logger.info(f"Запрос игроков: team_id={team_id}, skip={skip}, limit={limit}")

    try:
        player_service = PlayerService(db)
        players = player_service.get_all_players(team_id=team_id, skip=skip, limit=limit)

        logger.info(f"Найдено {len(players)} игроков")
        return players

    except Exception as e:
        logger.error(f"Ошибка в get_all_players: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении игроков: {str(e)}"
        )


@router.get("/{player_id}", response_model=schemas.PlayerResponse)
async def get_player_by_id(
        player_id: int,
        db: Session = Depends(get_db)
):
    """Получение игрока по ID с его статистикой из player_stats"""
    logger.info(f"Запрос игрока по ID: {player_id}")

    try:
        player_service = PlayerService(db)
        player = player_service.get_player_by_id(player_id)

        if not player:
            logger.warning(f"Игрок с ID {player_id} не найден")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Игрок с ID {player_id} не найден"
            )

        return player

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка в get_player_by_id: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении игрока: {str(e)}"
        )


@router.get("/team/{team_id}", response_model=List[schemas.PlayerResponse])
async def get_players_by_team(
        team_id: int,
        db: Session = Depends(get_db)
):
    """Получение всех игроков команды со статистикой из player_stats"""
    logger.info(f"Запрос игроков команды ID: {team_id}")

    try:
        player_service = PlayerService(db)
        players = player_service.get_players_by_team(team_id)

        logger.info(f"Найдено {len(players)} игроков для команды {team_id}")
        return players

    except Exception as e:
        logger.error(f"Ошибка в get_players_by_team: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении игроков команды: {str(e)}"
        )


@router.get("/stats/top", response_model=List[dict])
async def get_top_players(
        min_games: int = Query(5, ge=1, description="Минимум сыгранных игр"),
        db: Session = Depends(get_db)
):
    """Получение топ-игроков по статистике"""
    logger.info(f"Запрос топ-игроков с минимум {min_games} игр")

    try:
        player_service = PlayerService(db)
        players = player_service.get_players_with_stats(min_games=min_games)

        return players

    except Exception as e:
        logger.error(f"Ошибка в get_top_players: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении топ-игроков: {str(e)}"
        )