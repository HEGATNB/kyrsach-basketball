# controllers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from database import get_db
import schemas
from services.auth_service import AuthService
from services.audit_service import AuditService
from scripts.auth import generate_token, TokenPayload

router = APIRouter()


class LoginRequest:
    def __init__(self, email: str, password: str, identifier: Optional[str] = None):
        self.email = email
        self.password = password
        self.identifier = identifier


# controllers/auth.py
@router.post("/login", response_model=schemas.TokenResponse)
async def login(
        request: Request,
        db: Session = Depends(get_db)
):
    """Вход в систему - принимает JSON с любыми полями"""
    try:
        # Получаем тело запроса как dict
        body = await request.json()
        print(f"📥 Получен запрос на логин: {body}")

        # Определяем, что использовать для поиска пользователя
        identifier = body.get("identifier") or body.get("email")
        password = body.get("password")

        if not identifier or not password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Необходимо указать email/identifier и пароль"
            )

        print(f"🔑 Попытка входа с identifier: {identifier}")

        service = AuthService(db)

        # Пробуем найти пользователя по email или имени
        user = None

        # Сначала пробуем как email
        if "@" in identifier:
            user = service.authenticate_user(identifier, password)
        else:
            # Пробуем найти по имени пользователя (username)
            from sqlalchemy import text
            result = db.execute(
                text("SELECT id, email, name, username, role, password_hash, is_blocked, created_at FROM users WHERE username = :username OR name = :name"),
                {"username": identifier, "name": identifier}
            ).fetchone()

            if result:
                user_data = dict(result._mapping)
                # Проверяем пароль
                from scripts.auth import verify_password
                if verify_password(password, user_data["password_hash"]):
                    user = {
                        "id": user_data["id"],
                        "email": user_data["email"],
                        "name": user_data["name"] or user_data["username"],
                        "role": user_data["role"],
                        "is_blocked": user_data["is_blocked"],
                        "created_at": user_data["created_at"]
                    }

        if not user:
            print(f"❌ Неудачная попытка входа для {identifier}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный email/имя или пароль",
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
        print(f"✅ Токен создан для {user['email']}")

        # Логирование
        try:
            audit = AuditService(db)
            audit.log(
                user_id=user["id"],
                action="LOGIN",
                entity="User",
                entity_id=user["id"],
                ip_address=request.client.host if request.client else None
            )
        except Exception as e:
            print(f"⚠️ Ошибка логирования: {e}")

        # Формируем ответ
        user_response = schemas.UserResponse(
            id=user["id"],
            email=user["email"],
            name=user.get("name", user["email"]),
            role=user["role"],
            created_at=user.get("created_at", datetime.utcnow())
        )

        # Возвращаем токен в поле "token" как ожидает фронтенд
        return {
            "token": token,
            "token_type": "bearer",
            "user": user_response
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Ошибка в login: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера"
        )


@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
        request: Request,
        db: Session = Depends(get_db)
):
    """Регистрация нового пользователя"""
    try:
        # Получаем тело запроса
        body = await request.json()
        print(f"📥 Получен запрос на регистрацию: {body}")

        email = body.get("email")
        password = body.get("password")
        name = body.get("name") or body.get("username") or email.split('@')[0]
        username = body.get("username") or name

        if not email or not password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email и пароль обязательны"
            )

        service = AuthService(db)

        # Проверка существования пользователя
        existing = service.get_user_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует"
            )

        # Создание пользователя
        user = service.create_user({
            "email": email,
            "password": password,
            "name": name,
            "username": username,
            "role": "user"
        })

        # Логирование
        try:
            audit = AuditService(db)
            audit.log(
                user_id=user["id"],
                action="REGISTER",
                entity="User",
                entity_id=user["id"],
                ip_address=request.client.host if request.client else None
            )
        except Exception as e:
            print(f"⚠️ Ошибка логирования: {e}")

        print(f"✅ Пользователь зарегистрирован: {user['email']}")

        return schemas.UserResponse(
            id=user["id"],
            email=user["email"],
            name=user.get("name", user["email"]),
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
            detail="Внутренняя ошибка сервера"
        )


@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user_info(
        request: Request,
        db: Session = Depends(get_db)
):
    """Получение информации о текущем пользователе"""
    from middleware.auth import get_current_user

    try:
        print("🔍 Запрос информации о текущем пользователе")
        user_data = await get_current_user(request)

        if not user_data:
            print("❌ Пользователь не авторизован")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Не авторизован",
                headers={"WWW-Authenticate": "Bearer"},
            )

        print(f"✅ Токен валиден. User ID: {user_data.user_id}")

        service = AuthService(db)
        user = service.get_user_by_id(user_data.user_id)

        if not user:
            print(f"❌ Пользователь с ID {user_data.user_id} не найден в БД")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )

        print(f"✅ Информация о пользователе получена: {user['email']}")

        return schemas.UserResponse(
            id=user["id"],
            email=user["email"],
            name=user.get("name", user["email"]),
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
            detail="Внутренняя ошибка сервера"
        )


@router.post("/init")
async def init_database(db: Session = Depends(get_db)):
    """Инициализация базы данных тестовыми пользователями"""
    try:
        print("🚀 Инициализация базы данных тестовыми пользователями")
        service = AuthService(db)
        result = service.init_database()
        print(f"✅ Инициализация завершена: {result}")
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
            detail="Внутренняя ошибка сервера"
        )


@router.post("/logout")
async def logout(request: Request, db: Session = Depends(get_db)):
    """Выход из системы"""
    from middleware.auth import get_current_user

    try:
        user_data = await get_current_user(request)
        if user_data:
            try:
                audit = AuditService(db)
                audit.log(
                    user_id=user_data.user_id,
                    action="LOGOUT",
                    entity="User",
                    entity_id=user_data.user_id,
                    ip_address=request.client.host if request.client else None
                )
            except Exception as e:
                print(f"⚠️ Ошибка логирования выхода: {e}")
            print(f"👋 Выход пользователя {user_data.user_id}")

        return {"message": "Выход выполнен успешно"}
    except Exception as e:
        print(f"❌ Ошибка в logout: {e}")
        return {"message": "Выход выполнен успешно"}