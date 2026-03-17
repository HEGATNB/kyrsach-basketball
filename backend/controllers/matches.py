# controllers/matches.py
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import schemas
from services.match_service import MatchService
from services.team_service import TeamService
from services.audit_service import AuditService
from middleware.auth import require_admin_or_operator, require_admin

router = APIRouter()


@router.get("/", response_model=List[schemas.MatchResponse])
async def get_all_matches(
        status: Optional[str] = Query(None, description="Фильтр по статусу (finished/scheduled)"),
        team_id: Optional[int] = Query(None, description="Фильтр по ID команды"),
        skip: int = Query(0, ge=0, description="Сколько пропустить"),
        limit: int = Query(100, ge=1, le=1000, description="Сколько вернуть"),
        db: Session = Depends(get_db)
):
    """Получение списка матчей с фильтрацией"""
    try:
        match_service = MatchService(db)

        filters = {}
        if status:
            if status not in ["finished", "scheduled"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Статус должен быть 'finished' или 'scheduled'"
                )
            filters["status"] = status

        matches = match_service.get_all_matches(filters, skip=skip, limit=limit)

        # Фильтрация по команде
        if team_id:
            matches = [m for m in matches if m["home_team_id"] == team_id or m["away_team_id"] == team_id]

        return matches

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка в get_all_matches: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера"
        )


@router.get("/{match_id}", response_model=schemas.MatchResponse)
async def get_match_by_id(
        match_id: int,
        db: Session = Depends(get_db)
):
    """Получение матча по ID"""
    try:
        match_service = MatchService(db)
        match = match_service.get_match_by_id(match_id)

        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Матч с ID {match_id} не найден"
            )

        return match

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка в get_match_by_id: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера"
        )


@router.post("/", response_model=schemas.MatchResponse, status_code=status.HTTP_201_CREATED)
async def create_match(
        match_data: schemas.MatchCreate,
        request: Request,
        db: Session = Depends(get_db)
):
    """Создание нового матча"""
    # Проверка прав доступа
    user = await require_admin_or_operator(request)

    match_service = MatchService(db)

    # Проверка существования команд
    team_service = TeamService(db)
    home_team = team_service.get_team_by_id(match_data.home_team_id)
    away_team = team_service.get_team_by_id(match_data.away_team_id)

    if not home_team or not away_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Одна из команд не найдена"
        )

    if match_data.home_team_id == match_data.away_team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Команды должны быть разными"
        )

    match = match_service.create_match(match_data, user.user_id)

    audit_service = AuditService(db)
    audit_service.log(
        user_id=user.user_id,
        action="CREATE",
        entity="Match",
        entity_id=match["id"],
        details={
            "home_team": home_team["name"],
            "away_team": away_team["name"],
            "date": match_data.date.isoformat()
        }
    )

    return match


@router.put("/{match_id}/result", response_model=schemas.MatchResponse)
async def update_match_result(
        match_id: int,
        result_data: schemas.MatchResultUpdate,
        request: Request,
        db: Session = Depends(get_db)
):
    """Обновление результата матча"""
    # Проверка прав доступа
    user = await require_admin_or_operator(request)

    match_service = MatchService(db)

    match = match_service.get_match_by_id(match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Матч с ID {match_id} не найден"
        )

    updated_match = match_service.update_match_result(
        match_id,
        result_data.home_score,
        result_data.away_score,
        user.user_id
    )

    audit_service = AuditService(db)
    audit_service.log(
        user_id=user.user_id,
        action="UPDATE_RESULT",
        entity="Match",
        entity_id=match_id,
        details={
            "home_score": result_data.home_score,
            "away_score": result_data.away_score
        }
    )

    return updated_match


@router.delete("/{match_id}")
async def delete_match(
        match_id: int,
        request: Request,
        db: Session = Depends(get_db)
):
    """Удаление матча (только для админов)"""
    # Проверка прав доступа
    user = await require_admin(request)

    match_service = MatchService(db)

    match = match_service.get_match_by_id(match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Матч с ID {match_id} не найден"
        )

    deleted_match = match_service.delete_match(match_id, user.user_id)

    audit_service = AuditService(db)
    audit_service.log(
        user_id=user.user_id,
        action="DELETE",
        entity="Match",
        entity_id=match_id,
        details={
            "home_team_id": match["home_team_id"],
            "away_team_id": match["away_team_id"]
        }
    )

    return {"message": "Матч удален", "match": deleted_match}