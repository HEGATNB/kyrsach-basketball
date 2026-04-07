from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
from typing import List, Dict, Any

from database import get_db
from services.audit_service import AuditService
from services.auth_service import AuthService
from middleware.auth import require_admin
import schemas

router = APIRouter()

# Статистика админ панели
@router.get("/stats")
async def get_admin_stats(
        request: Request,
        db: Session = Depends(get_db)
):
    await require_admin(request)

    try:
        # Получаем количество пользователей
        total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar()

        # Получаем количество команд
        total_teams = db.execute(text("SELECT COUNT(*) FROM team")).scalar()

        # Получаем количество игроков
        total_players = db.execute(text("SELECT COUNT(*) FROM players")).scalar()

        # Получаем количество матчей
        total_matches = db.execute(text("SELECT COUNT(*) FROM game")).scalar()

        # Получаем количество прогнозов
        total_predictions = db.execute(text("SELECT COUNT(*) FROM predictions")).scalar()

        # Получаем количество бэкапов
        total_backups = db.execute(text("SELECT COUNT(*) FROM backups")).scalar() if check_table_exists(db,
                                                                                                        "backups") else 0

        # Получаем точность модели из метрик
        accuracy = None
        if check_table_exists(db, "model_metrics"):
            result = db.execute(text("""
                SELECT validation_accuracy FROM model_metrics 
                WHERE status = 'completed' 
                ORDER BY training_date DESC 
                LIMIT 1
            """)).fetchone()
            if result:
                accuracy = result[0] * 100 if result[0] else None

        # Получаем дату последнего бэкапа
        last_backup_at = None
        if check_table_exists(db, "backups"):
            result = db.execute(text("""
                SELECT created_at FROM backups 
                ORDER BY created_at DESC 
                LIMIT 1
            """)).fetchone()
            if result:
                last_backup_at = result[0].isoformat() if result[0] else None

        return {
            "totalUsers": total_users or 0,
            "totalTeams": total_teams or 0,
            "totalPlayers": total_players or 0,
            "totalMatches": total_matches or 0,
            "totalPredictions": total_predictions or 0,
            "totalBackups": total_backups or 0,
            "accuracy": accuracy,
            "lastBackupAt": last_backup_at
        }

    except Exception as e:
        print(f"Error getting admin stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting stats: {str(e)}"
        )


@router.get("/users", response_model=List[schemas.UserResponse])
async def get_all_users(
        request: Request,
        db: Session = Depends(get_db)
):
    await require_admin(request)

    try:
        result = db.execute(text("""
            SELECT id, email, name, username, role, is_blocked, created_at 
            FROM users 
            ORDER BY id
        """)).fetchall()

        users = []
        for row in result:
            user_data = dict(row._mapping)
            users.append(schemas.UserResponse(
                id=user_data["id"],
                email=user_data["email"],
                name=user_data.get("name") or user_data.get("username") or user_data["email"],
                role=user_data["role"],
                created_at=user_data["created_at"],
                is_blocked=user_data["is_blocked"]
            ))

        return users

    except Exception as e:
        print(f"Error getting users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting users: {str(e)}"
        )


@router.put("/users/{user_id}/block")
async def toggle_user_block(
        user_id: int,
        request: Request,
        db: Session = Depends(get_db)
):
    await require_admin(request)

    try:
        body = await request.json()
        is_blocked = body.get("isBlocked", False)

        # Нельзя заблокировать самого себя
        current_user = await require_admin(request)
        if current_user.user_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot block yourself"
            )

        # Обновляем статус
        db.execute(
            text("UPDATE users SET is_blocked = :is_blocked WHERE id = :user_id"),
            {"is_blocked": is_blocked, "user_id": user_id}
        )
        db.commit()

        # Получаем обновленного пользователя
        result = db.execute(
            text("SELECT id, email, name, username, role, is_blocked, created_at FROM users WHERE id = :user_id"),
            {"user_id": user_id}
        ).fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        user_data = dict(result._mapping)

        # Логируем действие
        audit = AuditService(db)
        audit.log(
            user_id=current_user.user_id,
            action="BLOCK_USER" if is_blocked else "UNBLOCK_USER",
            entity="User",
            entity_id=user_id,
            details={"user_id": user_id, "email": user_data["email"]},
            ip_address=request.client.host if request.client else None
        )

        return schemas.UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data.get("name") or user_data.get("username") or user_data["email"],
            role=user_data["role"],
            created_at=user_data["created_at"],
            is_blocked=user_data["is_blocked"]
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error toggling user block: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

# Роут для получения логов аудита
@router.get("/logs", response_model=List[schemas.AuditLogResponse])
async def get_audit_logs(
        request: Request,
        limit: int = 100,
        db: Session = Depends(get_db)
):
    await require_admin(request)

    try:
        audit = AuditService(db)
        logs = audit.get_all_logs(limit=limit)
        return logs

    except Exception as e:
        print(f"Error getting audit logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting logs: {str(e)}"
        )


@router.post("/backup")
async def create_backup(
        request: Request,
        db: Session = Depends(get_db)
):
    await require_admin(request)

    try:
        # Создаем таблицу для бэкапов если её нет
        create_backups_table(db)

        # Собираем данные
        teams = db.execute(text("SELECT * FROM team")).fetchall()
        users = db.execute(text("SELECT id, email, name, username, role, is_blocked, created_at FROM users")).fetchall()
        matches = db.execute(text("SELECT * FROM game LIMIT 1000")).fetchall()
        predictions = db.execute(text("SELECT * FROM predictions")).fetchall()

        # Создаем бэкап
        backup_data = {
            "teams": [dict(row._mapping) for row in teams],
            "users": [dict(row._mapping) for row in users],
            "matches": [dict(row._mapping) for row in matches],
            "predictions": [dict(row._mapping) for row in predictions],
            "created_at": datetime.now().isoformat(),
            "version": "1.0"
        }

        import json
        import os

        # Сохраняем в файл
        backup_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backups")
        os.makedirs(backup_dir, exist_ok=True)

        filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(backup_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)

        # Сохраняем запись в таблицу backups
        file_size = os.path.getsize(filepath)

        result = db.execute(
            text("""
                INSERT INTO backups (filename, size, type, status, created_at)
                VALUES (:filename, :size, :type, :status, :created_at)
                RETURNING id
            """),
            {
                "filename": filename,
                "size": file_size,
                "type": "manual",
                "status": "completed",
                "created_at": datetime.now()
            }
        )
        db.commit()

        backup_id = result.scalar()

        # Логируем действие
        audit = AuditService(db)
        audit.log(
            user_id=(await require_admin(request)).user_id,
            action="CREATE_BACKUP",
            entity="Backup",
            entity_id=backup_id,
            details={"filename": filename, "size": file_size},
            ip_address=request.client.host if request.client else None
        )

        return {
            "id": str(backup_id),
            "filename": filename,
            "size": file_size,
            "type": "manual",
            "status": "completed",
            "createdAt": datetime.now().isoformat()
        }

    except Exception as e:
        db.rollback()
        print(f"Error creating backup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating backup: {str(e)}"
        )


@router.get("/backups", response_model=List[schemas.BackupResponse])
async def get_backups(
        request: Request,
        db: Session = Depends(get_db)
):
    await require_admin(request)

    try:
        create_backups_table(db)

        result = db.execute(text("""
            SELECT id, filename, size, type, status, created_at
            FROM backups
            ORDER BY created_at DESC
        """)).fetchall()

        backups = []
        for row in result:
            data = dict(row._mapping)
            backups.append({
                "id": str(data["id"]),
                "filename": data["filename"],
                "size": data["size"],
                "type": data["type"],
                "status": data["status"],
                "createdAt": data["created_at"].isoformat() if data["created_at"] else None
            })

        return backups

    except Exception as e:
        print(f"Error getting backups: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting backups: {str(e)}"
        )


@router.post("/restore/{backup_id}")
async def restore_backup(
        backup_id: int,
        request: Request,
        db: Session = Depends(get_db)
):
    await require_admin(request)

    try:
        # Получаем информацию о бэкапе
        result = db.execute(
            text("SELECT filename FROM backups WHERE id = :id"),
            {"id": backup_id}
        ).fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup not found"
            )

        import json
        import os

        backup_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backups")
        filepath = os.path.join(backup_dir, result[0])

        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup file not found"
            )

        with open(filepath, 'r', encoding='utf-8') as f:
            backup_data = json.load(f)

        # Восстанавливаем данные
        if "teams" in backup_data:
            # Очищаем таблицы перед восстановлением
            db.execute(text("TRUNCATE TABLE team RESTART IDENTITY CASCADE"))
            db.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))
            db.execute(text("TRUNCATE TABLE game RESTART IDENTITY CASCADE"))
            db.execute(text("TRUNCATE TABLE predictions RESTART IDENTITY CASCADE"))

            # Восстанавливаем команды
            for team in backup_data["teams"]:
                db.execute(
                    text("""
                        INSERT INTO team (id, full_name, abbreviation, nickname, city, state, year_founded)
                        VALUES (:id, :full_name, :abbreviation, :nickname, :city, :state, :year_founded)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    team
                )

            # Восстанавливаем пользователей
            for user in backup_data["users"]:
                db.execute(
                    text("""
                        INSERT INTO users (id, email, name, username, role, is_blocked, created_at)
                        VALUES (:id, :email, :name, :username, :role, :is_blocked, :created_at)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    user
                )

            # Восстанавливаем матчи
            for match in backup_data["matches"]:
                db.execute(
                    text("""
                        INSERT INTO game (game_id, game_date, team_id_home, team_abbreviation_home, team_name_home, 
                                          team_id_away, team_abbreviation_away, team_name_away, pts_home, pts_away, wl_home, wl_away)
                        VALUES (:game_id, :game_date, :team_id_home, :team_abbreviation_home, :team_name_home,
                                :team_id_away, :team_abbreviation_away, :team_name_away, :pts_home, :pts_away, :wl_home, :wl_away)
                        ON CONFLICT (game_id) DO NOTHING
                    """),
                    match
                )

            db.commit()

        audit = AuditService(db)
        audit.log(
            user_id=(await require_admin(request)).user_id,
            action="RESTORE_BACKUP",
            entity="Backup",
            entity_id=backup_id,
            details={"filename": result[0]},
            ip_address=request.client.host if request.client else None
        )

        return {"message": "Backup restored successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error restoring backup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error restoring backup: {str(e)}"
        )


def check_table_exists(db: Session, table_name: str) -> bool:
    try:
        result = db.execute(
            text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = :table_name)"),
            {"table_name": table_name}
        ).scalar()
        return result
    except:
        return False


def create_backups_table(db: Session):
    try:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS backups (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                size INTEGER,
                type VARCHAR(50) DEFAULT 'manual',
                status VARCHAR(50) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.commit()
    except Exception as e:
        print(f"Error creating backups table: {e}")
        db.rollback()
