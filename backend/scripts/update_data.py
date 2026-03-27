import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
from datetime import datetime, timedelta
import time
import sys
import io
import requests
import json
import os
from dotenv import load_dotenv

# Исправляем проблемы с кодировкой в Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

load_dotenv()

# Используем параметры из .env
DB_NAME = os.getenv("DB_NAME", "nba")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "12345678")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

# Расширенный маппинг названий команд из ESPN в аббревиатуры БД
TEAM_NAME_MAP = {
    # Обычные команды с учётом ваших аббревиатур
    'Atlanta Hawks': 'ATL',
    'Boston Celtics': 'BOS',
    'Brooklyn Nets': 'BKN',
    'Charlotte Hornets': 'CHA',
    'Chicago Bulls': 'CHI',
    'Cleveland Cavaliers': 'CLE',
    'Dallas Mavericks': 'DAL',
    'Denver Nuggets': 'DEN',
    'Detroit Pistons': 'DET',
    'Golden State Warriors': 'GSW',
    'Houston Rockets': 'HOU',
    'Indiana Pacers': 'IND',
    'LA Clippers': 'LAC',
    'Los Angeles Clippers': 'LAC',
    'Los Angeles Lakers': 'LAL',
    'Memphis Grizzlies': 'MEM',
    'Miami Heat': 'MIA',
    'Milwaukee Bucks': 'MIL',
    'Minnesota Timberwolves': 'MIN',
    'New Orleans Pelicans': 'NOP',
    'New York Knicks': 'NYK',
    'Oklahoma City Thunder': 'OKC',
    'Orlando Magic': 'ORL',
    'Philadelphia 76ers': 'PHI',
    'Phoenix Suns': 'PHX',
    'Portland Trail Blazers': 'POR',
    'Sacramento Kings': 'SAC',
    'San Antonio Spurs': 'SAS',
    'Toronto Raptors': 'TOR',
    'Utah Jazz': 'UTA',
    'Washington Wizards': 'WAS',

    # Альтернативные названия
    'LA Lakers': 'LAL',
    'LA Clippers': 'LAC',
    'New Orleans': 'NOP',
    'Oklahoma City': 'OKC',
    'San Antonio': 'SAS',
    'Golden State': 'GSW',
    'Brooklyn': 'BKN',
    'Charlotte': 'CHA',
    'Phoenix': 'PHX',

    # Специальные игры
    'Team Stars': 'ALL',
    'Team Stripes': 'ALL',
    'World': 'ALL',
    'USA': 'ALL',
}

# Список специальных игр, которые мы не добавляем в БД
SPECIAL_GAME_KEYWORDS = ['Team', 'World', 'USA', 'All-Star', 'All Star', 'Rising Stars', 'Celebrity']


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


def get_team_id_map(conn):
    """Создаёт словарь {team_abbreviation: team_id} из таблицы game."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT team_abbreviation_home as abbrev, team_id_home as team_id 
        FROM game 
        WHERE team_id_home IS NOT NULL
        UNION
        SELECT DISTINCT team_abbreviation_away as abbrev, team_id_away as team_id 
        FROM game 
        WHERE team_id_away IS NOT NULL
    """)
    rows = cursor.fetchall()
    team_map = {row['abbrev']: row['team_id'] for row in rows}
    cursor.close()

    # Добавляем заглушку для специальных игр
    team_map['ALL'] = 0

    print(f"  Found {len(team_map)} teams in database: {list(team_map.keys())}")
    return team_map


def is_special_game(away_name, home_name):
    """Проверяет, является ли игра специальной (All-Star и т.д.)"""
    combined = f"{away_name} {home_name}".lower()
    for keyword in SPECIAL_GAME_KEYWORDS:
        if keyword.lower() in combined:
            return True
    return False


def fetch_espn_games(date):
    """
    Получает игры за указанную дату через ESPN API.
    """
    print(f"\n📅 Checking {date}")

    date_str = date.strftime("%Y%m%d")
    url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
    params = {
        "dates": date_str,
        "limit": 100
    }

    print(f"  Fetching from ESPN: {url}")

    try:
        response = requests.get(url, params=params, timeout=15)

        if response.status_code != 200:
            print(f"  ❌ ESPN API returned {response.status_code}")
            return []

        data = response.json()
        events = data.get('events', [])

        print(f"  Found {len(events)} games")

        if events:
            # Покажем первую игру для отладки
            first_game = events[0]
            competitions = first_game.get('competitions', [{}])[0]
            competitors = competitions.get('competitors', [])
            if len(competitors) >= 2:
                away = competitors[0].get('team', {}).get('displayName', 'Unknown')
                home = competitors[1].get('team', {}).get('displayName', 'Unknown')
                print(f"  Sample: {away} @ {home}")

        return events

    except requests.exceptions.RequestException as e:
        print(f"  ❌ Request error: {e}")
        return []
    except Exception as e:
        print(f"  ❌ Unexpected error: {e}")
        return []


def fetch_detailed_stats(game_id):
    """
    Получает детальную статистику игры с ESPN.
    """
    url = f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary"
    params = {"event": game_id}

    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code != 200:
            return None

        data = response.json()

        # Извлекаем командную статистику из бокс-скора
        boxscore = data.get('boxscore', {})
        teams = boxscore.get('teams', [])

        result = {'home': {}, 'away': {}}

        for team in teams:
            team_stats = team.get('statistics', [])
            is_home = team.get('homeAway') == 'home'
            target = result['home'] if is_home else result['away']

            # Проходим по всем статистикам
            for stat in team_stats:
                for key, value in stat.items():
                    if isinstance(value, (int, float)) and key != 'label':
                        target[key] = value

        return result

    except Exception as e:
        print(f"    ⚠️ Could not fetch detailed stats: {e}")
        return None


def parse_espn_game(event, team_id_map):
    """
    Преобразует данные игры из ESPN API в формат таблицы game.
    """
    try:
        game_id = event['id']
        game_date = datetime.strptime(event['date'], "%Y-%m-%dT%H:%MZ")

        # Получаем основную информацию о матче
        competitions = event.get('competitions', [{}])[0]
        competitors = competitions.get('competitors', [])

        if len(competitors) < 2:
            print(f"    ❌ Not enough competitors")
            return None

        # Определяем кто играет
        away_competitor = competitors[0]
        home_competitor = competitors[1]

        away_team_name = away_competitor.get('team', {}).get('displayName', '')
        home_team_name = home_competitor.get('team', {}).get('displayName', '')

        # Проверяем на специальные игры
        if is_special_game(away_team_name, home_team_name):
            print(f"    ℹ️ Skipping special game: {away_team_name} @ {home_team_name}")
            return None

        # Получаем аббревиатуры
        away_abbrev = TEAM_NAME_MAP.get(away_team_name)
        home_abbrev = TEAM_NAME_MAP.get(home_team_name)

        if not away_abbrev or not home_abbrev:
            print(f"    ❌ Unknown team: '{away_team_name}' -> '{away_abbrev}', '{home_team_name}' -> '{home_abbrev}'")
            return None

        # Получаем ID из БД
        away_id = team_id_map.get(away_abbrev)
        home_id = team_id_map.get(home_abbrev)

        if not away_id or not home_id:
            print(f"    ❌ Team ID not found in DB: {away_abbrev} ({away_id}) or {home_abbrev} ({home_id})")
            return None

        # Получаем счёт
        away_score = int(away_competitor.get('score', 0))
        home_score = int(home_competitor.get('score', 0))
        home_win = home_score > away_score

        # Получаем детальную статистику
        print(f"    Fetching detailed stats for game {game_id}...")
        detailed_stats = fetch_detailed_stats(game_id)

        if detailed_stats:
            home_stats = detailed_stats.get('home', {})
            away_stats = detailed_stats.get('away', {})
        else:
            home_stats = {}
            away_stats = {}
            print(f"    ⚠️ Using basic stats only")

        # Функция для безопасного получения значения
        def get_stat(stat_dict, key, default=0):
            return stat_dict.get(key, default)

        # Функция для безопасного вычисления процентов
        def safe_pct(made, att):
            return round(made / att, 3) if att and att > 0 else 0

        # Формируем запись
        game_record = {
            'game_id': f"ESPN_{game_id}",
            'game_date': game_date.strftime("%Y-%m-%d %H:%M:%S"),
            'season_id': f"2{game_date.year - 1 if game_date.month < 10 else game_date.year}",
            'season_type': 'Regular Season',

            # Home team
            'team_id_home': home_id,
            'team_abbreviation_home': home_abbrev,
            'team_name_home': home_team_name,
            'matchup_home': f"{home_abbrev} vs. {away_abbrev}",
            'wl_home': 'W' if home_win else 'L',
            'min': 240,
            'fgm_home': get_stat(home_stats, 'fieldGoalsMade'),
            'fga_home': get_stat(home_stats, 'fieldGoalsAttempted'),
            'fg_pct_home': safe_pct(
                get_stat(home_stats, 'fieldGoalsMade'),
                get_stat(home_stats, 'fieldGoalsAttempted')
            ),
            'fg3m_home': get_stat(home_stats, 'threePointFieldGoalsMade'),
            'fg3a_home': get_stat(home_stats, 'threePointFieldGoalsAttempted'),
            'fg3_pct_home': safe_pct(
                get_stat(home_stats, 'threePointFieldGoalsMade'),
                get_stat(home_stats, 'threePointFieldGoalsAttempted')
            ),
            'ftm_home': get_stat(home_stats, 'freeThrowsMade'),
            'fta_home': get_stat(home_stats, 'freeThrowsAttempted'),
            'ft_pct_home': safe_pct(
                get_stat(home_stats, 'freeThrowsMade'),
                get_stat(home_stats, 'freeThrowsAttempted')
            ),
            'oreb_home': get_stat(home_stats, 'offensiveRebounds'),
            'dreb_home': get_stat(home_stats, 'defensiveRebounds'),
            'reb_home': get_stat(home_stats, 'rebounds'),
            'ast_home': get_stat(home_stats, 'assists'),
            'stl_home': get_stat(home_stats, 'steals'),
            'blk_home': get_stat(home_stats, 'blocks'),
            'tov_home': get_stat(home_stats, 'turnovers'),
            'pf_home': get_stat(home_stats, 'fouls'),
            'pts_home': home_score,
            'plus_minus_home': 0,

            # Away team
            'team_id_away': away_id,
            'team_abbreviation_away': away_abbrev,
            'team_name_away': away_team_name,
            'matchup_away': f"{away_abbrev} @ {home_abbrev}",
            'wl_away': 'L' if home_win else 'W',
            'fgm_away': get_stat(away_stats, 'fieldGoalsMade'),
            'fga_away': get_stat(away_stats, 'fieldGoalsAttempted'),
            'fg_pct_away': safe_pct(
                get_stat(away_stats, 'fieldGoalsMade'),
                get_stat(away_stats, 'fieldGoalsAttempted')
            ),
            'fg3m_away': get_stat(away_stats, 'threePointFieldGoalsMade'),
            'fg3a_away': get_stat(away_stats, 'threePointFieldGoalsAttempted'),
            'fg3_pct_away': safe_pct(
                get_stat(away_stats, 'threePointFieldGoalsMade'),
                get_stat(away_stats, 'threePointFieldGoalsAttempted')
            ),
            'ftm_away': get_stat(away_stats, 'freeThrowsMade'),
            'fta_away': get_stat(away_stats, 'freeThrowsAttempted'),
            'ft_pct_away': safe_pct(
                get_stat(away_stats, 'freeThrowsMade'),
                get_stat(away_stats, 'freeThrowsAttempted')
            ),
            'oreb_away': get_stat(away_stats, 'offensiveRebounds'),
            'dreb_away': get_stat(away_stats, 'defensiveRebounds'),
            'reb_away': get_stat(away_stats, 'rebounds'),
            'ast_away': get_stat(away_stats, 'assists'),
            'stl_away': get_stat(away_stats, 'steals'),
            'blk_away': get_stat(away_stats, 'blocks'),
            'tov_away': get_stat(away_stats, 'turnovers'),
            'pf_away': get_stat(away_stats, 'fouls'),
            'pts_away': away_score,
            'plus_minus_away': 0,

            'video_available_home': 0,
            'video_available_away': 0
        }

        return game_record

    except Exception as e:
        print(f"    ❌ Error parsing game: {e}")
        return None


def game_exists(conn, game_id):
    """Проверяет, существует ли уже игра в БД"""
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM game WHERE game_id = %s", (game_id,))
    exists = cursor.fetchone() is not None
    cursor.close()
    return exists


def insert_game(conn, game):
    """Вставляет запись в таблицу game."""
    cursor = conn.cursor()

    # Проверяем, существует ли уже игра
    if game_exists(conn, game['game_id']):
        print(f"    ⏭️ Game {game['game_id']} already exists")
        return False

    # Формируем запрос
    columns = ', '.join(game.keys())
    placeholders = ', '.join(['%s'] * len(game))
    query = f"INSERT INTO game ({columns}) VALUES ({placeholders})"

    try:
        cursor.execute(query, list(game.values()))
        conn.commit()
        return True
    except Exception as e:
        print(f"    ❌ Error inserting game: {e}")
        conn.rollback()
        return False
    finally:
        cursor.close()


def update_db_with_new_games(db_path=None, days_back=7):
    """
    Обновляет базу новыми играми через ESPN API.
    Параметр db_path оставлен для совместимости, не используется
    """
    print(f"\n{'=' * 60}")
    print(f"🔄 Updating database with games from last {days_back} days using ESPN API")
    print(f"{'=' * 60}")

    conn = get_db_connection()
    team_id_map = get_team_id_map(conn)
    today = datetime.now().date()
    new_count = 0
    failed_count = 0
    skipped_count = 0

    for i in range(days_back):
        date = today - timedelta(days=i)

        events = fetch_espn_games(date)

        for event in events:
            print(f"  Processing game {event['id']}:")
            game_record = parse_espn_game(event, team_id_map)

            if game_record is None:
                failed_count += 1
            elif game_record and insert_game(conn, game_record):
                new_count += 1
                print(f"    ✅ Added: {game_record['team_abbreviation_away']} @ {game_record['team_abbreviation_home']}")
            else:
                skipped_count += 1

            # Задержка между запросами
            time.sleep(1)

        # Задержка между днями
        if i < days_back - 1:
            print(f"  Waiting before next day...")
            time.sleep(2)

    conn.close()

    print(f"\n{'=' * 60}")
    print(f"📊 Summary:")
    print(f"  • Games added: {new_count}")
    print(f"  • Failed to add: {failed_count}")
    print(f"  • Skipped (already exist): {skipped_count}")
    print(f"{'=' * 60}")

    return new_count


if __name__ == "__main__":
    update_db_with_new_games(days_back=7)