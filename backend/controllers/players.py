# controllers/players.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any  # Добавляем Dict и Any
import logging

from database import get_db
from services.player_service import PlayerService
import schemas

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=List[schemas.PlayerResponse])
async def get_all_players(
    team: Optional[str] = Query(None, description="Фильтр по команде (аббревиатура, например 'LAL')"),
    season: Optional[str] = Query(None, description="Фильтр по сезону (например '2022-23')"),
    search: Optional[str] = Query(None, description="Поиск по имени игрока"),
    min_games: int = Query(5, ge=0, description="Минимум сыгранных игр"),
    sort_by: str = Query("pts", regex="^(pts|reb|ast|player_name|gp|season)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Получение списка всех игроков со статистикой"""
    logger.info(f"Запрос игроков: team={team}, season={season}, search={search}")

    try:
        player_service = PlayerService(db)
        players = player_service.get_all_players(
            team_abbrev=team,
            season=season,
            search=search,
            min_games=min_games,
            sort_by=sort_by,
            sort_order=sort_order,
            skip=skip,
            limit=limit
        )

        logger.info(f"Найдено {len(players)} игроков")
        return players

    except Exception as e:
        logger.error(f"Ошибка в get_all_players: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении игроков: {str(e)}"
        )


@router.get("/seasons", response_model=List[str])
async def get_seasons(db: Session = Depends(get_db)):
    """Получение списка всех доступных сезонов"""
    try:
        player_service = PlayerService(db)
        return player_service.get_seasons()
    except Exception as e:
        logger.error(f"Ошибка в get_seasons: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении сезонов"
        )


@router.get("/top/{category}", response_model=List[Dict[str, Any]])  # Исправлено здесь!
async def get_top_players(
    category: str,
    min_games: int = Query(10, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Получение топ-игроков по категории"""
    logger.info(f"Запрос топ-игроков: category={category}, min_games={min_games}")

    try:
        player_service = PlayerService(db)
        players = player_service.get_top_players(
            category=category,
            min_games=min_games,
            limit=limit
        )
        return players

    except Exception as e:
        logger.error(f"Ошибка в get_top_players: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении топ-игроков: {str(e)}"
        )


@router.get("/{player_id}", response_model=schemas.PlayerResponse)
async def get_player_by_id(
    player_id: int,
    db: Session = Depends(get_db)
):
    """Получение игрока по ID"""
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


@router.get("/team/{team_abbrev}", response_model=List[schemas.PlayerResponse])
async def get_players_by_team(
    team_abbrev: str,
    db: Session = Depends(get_db)
):
    """Получение игроков конкретной команды по аббревиатуре"""
    logger.info(f"Запрос игроков команды: {team_abbrev}")

    try:
        player_service = PlayerService(db)
        players = player_service.get_players_by_team(team_abbrev)

        logger.info(f"Найдено {len(players)} игроков для команды {team_abbrev}")
        return players

    except Exception as e:
        logger.error(f"Ошибка в get_players_by_team: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении игроков команды: {str(e)}"
        )