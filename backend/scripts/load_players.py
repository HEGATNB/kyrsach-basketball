import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import csv
import requests
from io import StringIO

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "nba")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "12345678")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")


def load_players_from_nba_api():
    """Загрузка игроков из NBA API"""
    try:
        # Здесь можно использовать nba_api или другой источник
        # Пока создадим тестовые данные
        players_data = [
            ("2544", "LeBron", "James", "LeBron James", 1),
            ("201939", "Stephen", "Curry", "Stephen Curry", 1),
            ("203507", "Giannis", "Antetokounmpo", "Giannis Antetokounmpo", 1),
            ("203076", "Anthony", "Davis", "Anthony Davis", 1),
            ("201142", "Kevin", "Durant", "Kevin Durant", 1),
        ]

        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        cursor = conn.cursor()

        # Создаем таблицу если нет
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS player (
                id TEXT PRIMARY KEY,
                first_name TEXT,
                last_name TEXT,
                full_name TEXT,
                is_active INTEGER DEFAULT 1
            )
        """)

        # Очищаем таблицу
        cursor.execute("DELETE FROM player")

        # Вставляем данные
        for player in players_data:
            cursor.execute("""
                INSERT INTO player (id, first_name, last_name, full_name, is_active)
                VALUES (%s, %s, %s, %s, %s)
            """, player)

        conn.commit()
        cursor.close()
        conn.close()

        print(f"✅ Загружено {len(players_data)} игроков")

    except Exception as e:
        print(f"❌ Ошибка загрузки игроков: {e}")


def load_from_common_player_info():
    """Проверка наличия данных в common_player_info"""
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            cursor_factory=RealDictCursor
        )
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) as count FROM common_player_info")
        result = cursor.fetchone()
        count = result['count'] if result else 0

        print(f"📊 В common_player_info: {count} записей")

        if count > 0:
            cursor.execute("SELECT * FROM common_player_info LIMIT 5")
            samples = cursor.fetchall()
            print("\n📝 Примеры игроков:")
            for sample in samples:
                print(f"  - {sample.get('display_first_last')} ({sample.get('team_name')})")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Ошибка проверки common_player_info: {e}")


if __name__ == "__main__":
    print("=" * 50)
    print("🔄 ЗАГРУЗКА ИГРОКОВ")
    print("=" * 50)

    # Проверяем common_player_info
    load_from_common_player_info()

    # Загружаем в таблицу player если нужно
    response = input("\nЗагрузить тестовых игроков в таблицу player? (y/n): ")
    if response.lower() == 'y':
        load_players_from_nba_api()