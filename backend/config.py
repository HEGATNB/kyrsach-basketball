# config.py
import os
from dotenv import load_dotenv
from pathlib import Path
from typing import List
import secrets

# Загружаем .env только в development
if os.getenv("ENVIRONMENT") != "production":
    load_dotenv()


class Config:
    # База данных - читаем из переменных окружения
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")

    # Формируем URL для подключения
    @property
    def DATABASE_URL(self) -> str:
        """Формирует URL для подключения к БД"""
        if all([self.DB_NAME, self.DB_USER, self.DB_PASSWORD]):
            return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        # Если нет отдельных параметров, пробуем получить полный URL
        return os.getenv("DATABASE_URL", "")

    # JWT настройки
    JWT_SECRET = os.getenv("JWT_SECRET")
    if not JWT_SECRET and os.getenv("ENVIRONMENT") == "production":
        raise ValueError("JWT_SECRET must be set in production!")
    elif not JWT_SECRET:
        # В development генерируем случайный ключ при каждом запуске
        JWT_SECRET = secrets.token_urlsafe(32)
        print("⚠️  WARNING: Using generated JWT secret. Set JWT_SECRET in .env for production!")

    JWT_EXPIRES_IN = os.getenv("JWT_EXPIRES_IN", "7d")

    # Пути
    BASE_DIR = Path(__file__).resolve().parent
    MODEL_DIR = os.getenv("MODEL_DIR", str(BASE_DIR / "models"))
    DB_PATH = os.getenv("DB_PATH", str(BASE_DIR / "nba.sqlite"))

    # Настройки нейросети
    STATS = ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'pf', 'fg_pct', 'fg3_pct', 'ft_pct']

    # Окружение
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    # CORS настройки - в продакшене только конкретные домены!
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        if self.ENVIRONMENT == "production":
            # В продакшене - только реальные домены
            return [
                "https://yourdomain.com",
                "https://api.yourdomain.com"
            ]
        # В разработке - локальные адреса
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
        ]

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


# Создаем глобальный экземпляр
config = Config()

# Проверяем критичные настройки в продакшене
if config.is_production:
    if not config.DATABASE_URL:
        raise ValueError("DATABASE_URL must be set in production!")
    if "postgresql://postgres:12345678@" in config.DATABASE_URL:
        raise ValueError("Using default credentials in production is FORBIDDEN!")