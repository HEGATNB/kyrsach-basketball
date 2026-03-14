from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
import schemas
from services import auth_service
from services.audit_service import AuditService
from scripts.auth import generate_token, TokenPayload

router = APIRouter()


@router.post("/login", response_model=schemas.TokenResponse)
async def login(
        login_data: schemas.UserLogin,
        request: Request,
        db: Session = Depends(get_db)
):
    """Вход в систему"""
    try:
        service = auth_service.AuthService(db)

        # Аутентификация пользователя
        user = service.authenticate_user(login_data.email, login_data.password)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный email или пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Проверка на блокировку
        if user.get("is_blocked"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Пользователь заблокирован"
            )

        # Создание токена
        payload = TokenPayload(
            user_id=user["id"],
            email=user["email"],
            role=user["role"]
        )
        token = generate_token(payload)

        # Логирование
        audit = AuditService(db)
        audit.log(
            user_id=user["id"],
            action="LOGIN",
            entity="User",
            entity_id=user["id"],
            ip_address=request.client.host if request.client else None
        )

        # Формируем ответ
        user_response = schemas.UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user.get("created_at", datetime.utcnow())
        )

        return schemas.TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_response
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка в login: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
        user_data: schemas.UserCreate,
        request: Request,
        db: Session = Depends(get_db)
):
    """Регистрация нового пользователя"""
    try:
        service = auth_service.AuthService(db)

        # Проверка существования пользователя
        existing = service.get_user_by_email(user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )

        # Создание пользователя
        user = service.create_user(user_data)

        # Логирование
        audit = AuditService(db)
        audit.log(
            user_id=user["id"],
            action="REGISTER",
            entity="User",
            entity_id=user["id"],
            ip_address=request.client.host if request.client else None
        )

        return schemas.UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user.get("created_at", datetime.utcnow())
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка в register: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user_info(
        request: Request,
        db: Session = Depends(get_db)
):
    """Получение информации о текущем пользователе"""
    from middleware.auth import get_current_user

    try:
        user_data = await get_current_user(request)
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Не авторизован"
            )

        service = auth_service.AuthService(db)
        user = service.get_user_by_id(user_data.user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )

        return schemas.UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            created_at=user.get("created_at", datetime.utcnow())
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка в me: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/init")
async def init_database(db: Session = Depends(get_db)):
    """Инициализация базы данных тестовыми пользователями"""
    try:
        service = auth_service.AuthService(db)
        result = service.init_database()
        return {
            "message": "База данных инициализирована",
            "created_users": result.get("created_users", [])
        }
    except Exception as e:
        print(f"❌ Ошибка в init: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/logout")
async def logout(request: Request, db: Session = Depends(get_db)):
    """Выход из системы"""
    from middleware.auth import get_current_user

    try:
        user_data = await get_current_user(request)
        if user_data:
            audit = AuditService(db)
            audit.log(
                user_id=user_data.user_id,
                action="LOGOUT",
                entity="User",
                entity_id=user_data.user_id,
                ip_address=request.client.host if request.client else None
            )

        return {"message": "Выход выполнен успешно"}
    except Exception as e:
        print(f"❌ Ошибка в logout: {e}")
        return {"message": "Выход выполнен успешно"}