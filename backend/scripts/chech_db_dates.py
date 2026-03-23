# check_db_dates.py
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime

# Загружаем env
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / 'env'
load_dotenv(env_path)

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

print("=" * 60)
print("🔍 ПРОВЕРКА ДАТ В ТАБЛИЦЕ GAME")
print("=" * 60)

try:
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

    cursor = conn.cursor()

    # Проверяем общее количество записей
    cursor.execute("SELECT COUNT(*) FROM game")
    total = cursor.fetchone()[0]
    print(f"📊 Всего записей в game: {total}")

    # Проверяем количество не-NULL дат
    cursor.execute("SELECT COUNT(*) FROM game WHERE game_date IS NOT NULL")
    not_null = cursor.fetchone()[0]
    print(f"📅 Записей с датой: {not_null}")

    # Получаем первые 10 дат
    cursor.execute("""
        SELECT game_date
        FROM game
        WHERE game_date IS NOT NULL
        LIMIT 10
    """)

    dates = cursor.fetchall()
    print("\n📅 Первые 10 дат в таблице:")
    for i, row in enumerate(dates):
        date_val = row[0]
        print(f"  {i}: '{date_val}' (тип: {type(date_val).__name__})")

    # Проверяем формат дат
    print("\n🔍 Анализ формата дат:")
    cursor.execute("""
        SELECT
            game_date,
            length(game_date) as len
        FROM game
        WHERE game_date IS NOT NULL
        LIMIT 20
    """)

    samples = cursor.fetchall()
    for row in samples:
        date_str = row[0]
        length = row[1]
        has_space = ' ' in date_str
        has_dash = '-' in date_str

        print(f"  '{date_str}' - длина: {length}, пробел: {has_space}, дефис: {has_dash}")

    # Проверяем уникальность дат
    cursor.execute("""
        SELECT COUNT(DISTINCT game_date)
        FROM game
        WHERE game_date IS NOT NULL
    """)
    unique_dates = cursor.fetchone()[0]
    print(f"\n📊 Уникальных дат: {unique_dates}")

    cursor.close()
    conn.close()

except Exception as e:
    print(f"❌ Ошибка: {e}")