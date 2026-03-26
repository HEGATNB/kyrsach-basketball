# middleware/auth.py
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.auth import verify_token, TokenPayload

security = HTTPBearer()


async def get_current_user(request: Request):
    """Получение текущего пользователя из токена"""
    authorization = request.headers.get("Authorization")

    if not authorization:
        print("⚠️ Нет заголовка Authorization")
        return None

    if not authorization.startswith("Bearer "):
        print("⚠️ Неправильный формат Authorization (должен быть Bearer)")
        return None

    token = authorization[7:]  # Убираем "Bearer "
    print(f"🔑 Получен токен: {token[:20]}...")

    payload = verify_token(token)

    if payload:
        print(f"✅ Пользователь аутентифицирован: ID={payload.user_id}, Email={payload.email}")
    else:
        print("❌ Токен недействителен")

    return payload


async def require_admin(request: Request):
    """Проверка роли admin"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен. Требуются права администратора"
        )
    return user


async def require_admin_or_operator(request: Request):
    """Проверка роли admin или operator"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.role not in ["admin", "operator"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен. Требуются права администратора или оператора"
        )
    return user