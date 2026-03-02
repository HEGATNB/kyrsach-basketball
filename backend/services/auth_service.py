from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import sys
import os

# Добавляем путь к корневой папке
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Импортируем функции напрямую, а не весь модуль
from scripts.auth import get_password_hash, verify_password, TokenPayload, generate_token
import schemas

# Импортируем настройки из database
from database import SessionLocal, engine


class AuthService:
    def __init__(self, db: Session):
        self.db = db

        # Проверяем подключение к PostgreSQL
        try:
            # Простой запрос для проверки подключения
            result = self.db.execute(text("SELECT 1")).scalar()
            print(f"📦 AuthService: успешное подключение к PostgreSQL")

            # Проверяем наличие таблицы users
            self._check_users_table()
        except Exception as e:
            print(f"❌ Ошибка подключения к PostgreSQL: {e}")
            raise

    def _check_users_table(self):
        """Проверяет наличие таблицы users"""
        try:
            # Проверяем существование таблицы users в PostgreSQL
            result = self.db.execute(
                text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')")
            ).scalar()

            if result:
                print("✅ Таблица users существует в PostgreSQL")

                # Проверяем количество пользователей
                count = self.db.execute(text("SELECT COUNT(*) FROM users")).scalar()
                print(f"📊 В таблице users {count} записей")

                # Если нет пользователей, создаем тестовых
                if count == 0:
                    self._create_test_users()
            else:
                print("❌ Таблица users не найдена в PostgreSQL")
                self._create_users_table()

        except Exception as e:
            print(f"❌ Ошибка при проверке таблицы users: {e}")
            self._create_users_table()

    def _create_users_table(self):
        """Создает таблицу users если её нет"""
        try:
            self.db.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    role VARCHAR(50) DEFAULT 'user',
                    is_blocked BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            self.db.commit()
            print("✅ Таблица users создана в PostgreSQL")

            # Создаем тестовых пользователей
            self._create_test_users()
        except Exception as e:
            print(f"❌ Ошибка при создании таблицы users: {e}")
            self.db.rollback()

    def _create_test_users(self):
        """Создание тестовых пользователей"""
        test_users = [
            ("admin@sys.com", get_password_hash("admin"), "Admin", "admin"),
            ("operator@sys.com", get_password_hash("operator"), "Operator", "operator"),
            ("user@sys.com", get_password_hash("user"), "User", "user"),
        ]

        created = []
        for email, pwd, name, role in test_users:
            try:
                # Проверяем существует ли пользователь
                existing = self.db.execute(
                    text("SELECT id FROM users WHERE email = :email"),
                    {"email": email}
                ).fetchone()

                if not existing:
                    self.db.execute(
                        text("""
                            INSERT INTO users (email, password_hash, name, role, created_at) 
                            VALUES (:email, :pwd, :name, :role, :created_at)
                        """),
                        {
                            "email": email,
                            "pwd": pwd,
                            "name": name,
                            "role": role,
                            "created_at": datetime.utcnow()
                        }
                    )
                    created.append(email)
                    print(f"✅ Создан тестовый пользователь: {email} / {role}")
            except Exception as e:
                print(f"⚠️ Ошибка создания пользователя {email}: {e}")

        self.db.commit()
        return created

    def get_user_by_email(self, email: str):
        """Получение пользователя по email"""
        try:
            result = self.db.execute(
                text("SELECT * FROM users WHERE email = :email"),
                {"email": email}
            ).fetchone()

            if result:
                # Конвертируем результат в словарь
                return dict(result._mapping)
            return None
        except Exception as e:
            print(f"❌ Ошибка получения пользователя по email: {e}")
            return None

    def get_user_by_id(self, user_id: int):
        """Получение пользователя по ID"""
        try:
            result = self.db.execute(
                text("SELECT * FROM users WHERE id = :id"),
                {"id": user_id}
            ).fetchone()

            if result:
                return dict(result._mapping)
            return None
        except Exception as e:
            print(f"❌ Ошибка получения пользователя по ID: {e}")
            return None

    def create_user(self, user_data):
        """Создание нового пользователя"""
        try:
            hashed_password = get_password_hash(user_data.password)

            result = self.db.execute(
                text("""
                    INSERT INTO users (email, password_hash, name, role, created_at) 
                    VALUES (:email, :pwd, :name, :role, :created_at)
                    RETURNING id, email, name, role, created_at
                """),
                {
                    "email": user_data.email,
                    "pwd": hashed_password,
                    "name": user_data.name,
                    "role": user_data.role or "user",
                    "created_at": datetime.utcnow()
                }
            )
            self.db.commit()

            new_user = result.fetchone()
            print(f"✅ Пользователь создан: {user_data.email}")

            if new_user:
                return dict(new_user._mapping)
            return None

        except Exception as e:
            print(f"❌ Ошибка создания пользователя: {e}")
            self.db.rollback()
            return None

    def authenticate_user(self, email: str, password: str):
        """Аутентификация пользователя"""
        user = self.get_user_by_email(email)

        if not user:
            print(f"❌ Пользователь {email} не найден")
            return None

        # Проверяем пароль
        if not verify_password(password, user["password_hash"]):
            print(f"❌ Неверный пароль для {email}")
            return None

        # Проверяем не заблокирован ли пользователь
        if user.get("is_blocked"):
            print(f"❌ Пользователь {email} заблокирован")
            return None

        print(f"✅ Успешная аутентификация: {email}")
        return user

    def init_database(self):
        """Инициализация БД тестовыми данными"""
        self._check_users_table()

        # Получаем список созданных пользователей
        users = self.db.execute(
            text("SELECT email, role FROM users ORDER BY id")
        ).fetchall()

        return {
            "message": "База данных инициализирована",
            "created_users": [dict(u._mapping) for u in users]
        }