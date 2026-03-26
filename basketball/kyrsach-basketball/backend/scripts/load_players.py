# load_players.py
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import csv
import requests
from io import StringIO
import pandas as pd

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "nba")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "12345678")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")


def get_db_connection():
    """Создает подключение к PostgreSQL"""
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        cursor_factory=RealDictCursor
    )
    return conn


def check_players_table():
    """Проверяет наличие таблицы players и её структуру"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'players'
            )
        """)
        exists = cursor.fetchone()['exists']

        if exists:
            cursor.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'players'
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            print(f"📊 Таблица 'players' существует, колонок: {len(columns)}")
            for col in columns[:10]:  # Покажем первые 10
                print(f"   - {col['column_name']}: {col['data_type']}")
        else:
            print("❌ Таблица 'players' не найдена")

        cursor.close()
        conn.close()
        return exists

    except Exception as e:
        print(f"❌ Ошибка проверки таблицы: {e}")
        return False


def load_players_from_csv(csv_path):
    """Загружает игроков из CSV файла в таблицу players"""
    try:
        if not os.path.exists(csv_path):
            print(f"❌ Файл {csv_path} не найден")
            return 0

        print(f"📥 Загрузка данных из {csv_path}...")
        df = pd.read_csv(csv_path)
        print(f"✅ Прочитано {len(df)} записей")

        conn = get_db_connection()
        cursor = conn.cursor()

        # Очищаем таблицу если нужно
        response = input("Очистить таблицу players перед загрузкой? (y/n): ")
        if response.lower() == 'y':
            cursor.execute("TRUNCATE TABLE players RESTART IDENTITY CASCADE")
            print("✅ Таблица очищена")

        # Вставляем данные
        inserted = 0
        for _, row in df.iterrows():
            try:
                cursor.execute("""
                    INSERT INTO players (
                        player_name, team_abbreviation, age, player_height, player_weight,
                        college, country, draft_year, draft_round, draft_number,
                        gp, pts, reb, ast, net_rating, oreb_pct, dreb_pct,
                        usg_pct, ts_pct, ast_pct, season
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    row.get('player_name'), row.get('team_abbreviation'),
                    row.get('age'), row.get('player_height'), row.get('player_weight'),
                    row.get('college'), row.get('country'), row.get('draft_year'),
                    row.get('draft_round'), row.get('draft_number'), row.get('gp'),
                    row.get('pts'), row.get('reb'), row.get('ast'), row.get('net_rating'),
                    row.get('oreb_pct'), row.get('dreb_pct'), row.get('usg_pct'),
                    row.get('ts_pct'), row.get('ast_pct'), row.get('season')
                ))
                inserted += 1
                if inserted % 1000 == 0:
                    print(f"   ... загружено {inserted} записей")
                    conn.commit()
            except Exception as e:
                print(f"⚠️ Ошибка вставки строки: {e}")

        conn.commit()
        cursor.close()
        conn.close()

        print(f"✅ Загружено {inserted} игроков")
        return inserted

    except Exception as e:
        print(f"❌ Ошибка загрузки: {e}")
        return 0


def load_from_common_player_info():
    """Проверка наличия данных в common_player_info"""
    try:
        conn = get_db_connection()
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


def get_player_stats_summary():
    """Получает статистику по игрокам"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT player_name) as unique_players,
                COUNT(DISTINCT team_abbreviation) as teams,
                COUNT(DISTINCT season) as seasons,
                AVG(pts) as avg_pts,
                MAX(pts) as max_pts
            FROM players
        """)
        stats = cursor.fetchone()

        print("\n📊 Статистика по игрокам:")
        print(f"  • Всего записей: {stats['total']}")
        print(f"  • Уникальных игроков: {stats['unique_players']}")
        print(f"  • Команд: {stats['teams']}")
        print(f"  • Сезонов: {stats['seasons']}")
        print(f"  • Средние очки: {stats['avg_pts']:.1f}")
        print(f"  • Макс. очки: {stats['max_pts']:.1f}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Ошибка получения статистики: {e}")


if __name__ == "__main__":
    print("=" * 50)
    print("🔄 ПРОВЕРКА ДАННЫХ ИГРОКОВ")
    print("=" * 50)

    # Проверяем таблицу players
    if check_players_table():
        # Показываем статистику
        get_player_stats_summary()

    # Проверяем common_player_info
    print("\n" + "=" * 50)
    load_from_common_player_info()

    # Спрашиваем про загрузку из CSV
    print("\n" + "=" * 50)
    csv_path = input("Путь к CSV файлу с игроками (или Enter для пропуска): ").strip()
    if csv_path:
        load_players_from_csv(csv_path)