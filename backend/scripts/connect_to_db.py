# connect_to_db.py
import os
import psycopg2
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()


def test_postgres_connection():
    """Тестирование подключения к PostgreSQL"""
    try:
        # Получаем параметры из DATABASE_URL или отдельных переменных
        db_url = os.getenv("DATABASE_URL", "postgresql://postgres:12345678@localhost/nba")

        # Разбираем URL
        # postgresql://user:password@host:port/dbname
        if db_url.startswith("postgresql://"):
            # Убираем протокол
            rest = db_url.replace("postgresql://", "")
            # Разделяем на части
            user_pass, host_port_db = rest.split("@", 1)
            user, password = user_pass.split(":", 1)
            host_port, dbname = host_port_db.split("/", 1)
            host, port = host_port.split(":", 1) if ":" in host_port else (host_port, "5432")
        else:
            # Используем отдельные переменные
            dbname = os.getenv("DB_NAME", "nba")
            user = os.getenv("DB_USER", "postgres")
            password = os.getenv("DB_PASSWORD", "12345678")
            host = os.getenv("DB_HOST", "localhost")
            port = os.getenv("DB_PORT", "5432")

        print(f"🔌 Подключение к PostgreSQL: {host}:{port}/{dbname} as {user}")

        # 1. Прямое подключение через psycopg2
        connection = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port
        )
        print("✅ Соединение через psycopg2 установлено")

        cursor = connection.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        print(f"📊 Версия PostgreSQL: {version[0]}")

        # 2. Проверка существующих таблиц
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print(f"\n📋 Существующие таблицы ({len(tables)}):")
        for table in tables[:10]:  # Покажем первые 10
            print(f"   - {table[0]}")
        if len(tables) > 10:
            print(f"   ... и еще {len(tables) - 10}")

        cursor.close()
        connection.close()
        print("\n✅ Соединение закрыто")

        # 3. Проверка через SQLAlchemy
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"))
            count = result.scalar()
            print(f"\n🔍 SQLAlchemy: найдено {count} таблиц")

        return True

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False


def create_required_tables():
    """Создание необходимых таблиц если их нет"""
    from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Boolean, DateTime, Float, Text
    from sqlalchemy.sql import func

    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:12345678@localhost/nba")
    engine = create_engine(db_url)
    metadata = MetaData()

    # Таблица пользователей
    users = Table(
        'users', metadata,
        Column('id', Integer, primary_key=True),
        Column('email', String, unique=True, nullable=False),
        Column('password_hash', String, nullable=False),
        Column('name', String, nullable=False),
        Column('role', String, default='user'),
        Column('is_blocked', Boolean, default=False),
        Column('created_at', DateTime, server_default=func.now()),
        extend_existing=True
    )

    # Таблица аудита
    audit_logs = Table(
        'audit_logs', metadata,
        Column('id', Integer, primary_key=True),
        Column('user_id', Integer),
        Column('action', String, nullable=False),
        Column('entity', String, nullable=False),
        Column('entity_id', Integer),
        Column('details', Text),
        Column('created_at', DateTime, server_default=func.now()),
        extend_existing=True
    )

    # Создаем таблицы если их нет
    metadata.create_all(engine)
    print("✅ Таблицы созданы/проверены")


if __name__ == "__main__":
    print("=" * 50)
    print("🔧 ТЕСТ ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ")
    print("=" * 50)

    if test_postgres_connection():
        print("\n" + "=" * 50)
        print("✅ Все тесты пройдены успешно!")
        print("=" * 50)

        # Спросим, нужно ли создать таблицы
        response = input("\nСоздать необходимые таблицы (users, audit_logs)? (y/n): ")
        if response.lower() == 'y':
            create_required_tables()
    else:
        print("\n❌ Тесты не пройдены. Проверьте подключение к базе.")