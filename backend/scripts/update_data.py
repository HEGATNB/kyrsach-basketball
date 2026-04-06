import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import time
import sys
import io
import requests
import os
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import config

# Устанавливаем кодирвку
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Используем параметры из config
DB_NAME = config.DB_NAME
DB_USER = config.DB_USER
DB_PASSWORD = config.DB_PASSWORD
DB_HOST = config.DB_HOST
DB_PORT = config.DB_PORT

# Расширенный маппинг названий команд из ESPN в аббревиатуры БД
TEAM_NAME_MAP = {
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
    'LA Lakers': 'LAL',
    'New Orleans': 'NOP',
    'Oklahoma City': 'OKC',
    'San Antonio': 'SAS',
    'Golden State': 'GSW',
    'Brooklyn': 'BKN',
    'Charlotte': 'CHA',
    'Phoenix': 'PHX',
    'Team Stars': 'ALL',
    'Team Stripes': 'ALL',
    'World': 'ALL',
    'USA': 'ALL',
}

SPECIAL_GAME_KEYWORDS = ['Team', 'World', 'USA', 'All-Star', 'All Star', 'Rising Stars', 'Celebrity']


def get_db_connection():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        cursor_factory=RealDictCursor
    )
    return conn

# Создание словаря {team_abbreviation: team_id} из таблицы game

def get_team_id_map(conn):
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
    team_map['ALL'] = 0
    print(f"  Found {len(team_map)} teams in database")
    return team_map


def is_special_game(away_name, home_name):
    combined = f"{away_name} {home_name}".lower()
    for keyword in SPECIAL_GAME_KEYWORDS:
        if keyword.lower() in combined:
            return True
    return False

# Получение новых игр

def fetch_espn_games(date):
    date_str = date.strftime("%Y%m%d")
    url = "http://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"
    params = {"dates": date_str, "limit": 100}

    try:
        response = requests.get(url, params=params, timeout=15)
        if response.status_code != 200:
            return []
        data = response.json()
        return data.get('events', [])
    except Exception as e:
        print(f"  ❌ Error fetching ESPN: {e}")
        return []

# Получаем статистику игры

def fetch_detailed_stats(game_id):
    url = f"http://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary"
    params = {"event": game_id}

    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code != 200:
            return None

        data = response.json()
        boxscore = data.get('boxscore', {})
        teams = boxscore.get('teams', [])

        result = {'home': {}, 'away': {}}
        for team in teams:
            team_stats = team.get('statistics', [])
            is_home = team.get('homeAway') == 'home'
            target = result['home'] if is_home else result['away']
            for stat in team_stats:
                for key, value in stat.items():
                    if isinstance(value, (int, float)) and key != 'label':
                        target[key] = value
        return result
    except Exception as e:
        return None


def update_existing_games(conn, days_back=2):
    """
    Обновляет результаты существующих матчей за последние дни.
    Особенно важно для матчей, которые были в статусе scheduled и теперь завершились.
    """
    print(f"\n{'=' * 60}")
    print("🔄 ОБНОВЛЕНИЕ РЕЗУЛЬТАТОВ ЗАВЕРШИВШИХСЯ МАТЧЕЙ")
    print(f"📅 Проверяем матчи за последние {days_back} дней")
    print(f"{'=' * 60}")

    cursor = conn.cursor()
    today = datetime.now().date()
    updated_count = 0
    already_finished = 0

    for i in range(days_back):
        date = today - timedelta(days=i)
        print(f"\n📅 Проверка матчей за {date}")

        # Исправленный запрос - используем %s вместо :date и DATE() вместо ::date
        cursor.execute("""
            SELECT game_id, team_id_home, team_id_away, team_abbreviation_home, team_abbreviation_away,
                   team_name_home, team_name_away, pts_home, pts_away, wl_home, wl_away
            FROM game
            WHERE DATE(game_date) = %s
              AND (pts_home IS NULL OR pts_away IS NULL)
        """, (date,))

        pending_games = cursor.fetchall()

        if not pending_games:
            print(f"   ✅ Нет незавершенных матчей за {date}")
            continue

        print(f"   📋 Найдено {len(pending_games)} незавершенных матчей")

        # Получаем актуальные данные из ESPN
        events = fetch_espn_games(date)
        if not events:
            print(f"   ⚠️ Не удалось получить данные с ESPN")
            continue

        # Создаем словарь для быстрого поиска
        espn_games = {}
        for event in events:
            try:
                competitions = event.get('competitions', [{}])[0]
                competitors = competitions.get('competitors', [])
                if len(competitors) >= 2:
                    away_name = competitors[0].get('team', {}).get('displayName', '')
                    home_name = competitors[1].get('team', {}).get('displayName', '')
                    espn_games[f"{home_name}_{away_name}"] = event
                    espn_games[f"{away_name}_{home_name}"] = event
                    # Также сохраняем по game_id
                    espn_games[event.get('id')] = event
            except Exception as e:
                continue

        # Обновляем каждый незавершенный матч
        for game in pending_games:
            game_data = dict(game._mapping)
            home_name = game_data.get("team_name_home")
            away_name = game_data.get("team_name_away")
            game_id = game_data.get("game_id")

            # Ищем матч по названиям команд или по ID
            espn_game = espn_games.get(f"{home_name}_{away_name}")
            if not espn_game:
                # Пробуем найти по ID (убираем префикс ESPN_)
                clean_id = game_id.replace("ESPN_", "")
                espn_game = espn_games.get(clean_id)

            if not espn_game:
                print(f"   ⚠️ Не найден матч в ESPN: {home_name} vs {away_name}")
                continue

            # Получаем детальную статистику
            detailed_stats = fetch_detailed_stats(espn_game.get('id'))
            if not detailed_stats:
                print(f"   ⚠️ Не удалось получить статистику для {home_name} vs {away_name}")
                continue

            # Получаем счет из ESPN
            competitions = espn_game.get('competitions', [{}])[0]
            competitors = competitions.get('competitors', [])
            home_score = 0
            away_score = 0

            for comp in competitors:
                if comp.get('homeAway') == 'home':
                    home_score = int(comp.get('score', 0))
                else:
                    away_score = int(comp.get('score', 0))

            # Проверяем, есть ли уже счет (матч мог завершиться)
            if home_score == 0 and away_score == 0:
                print(f"   ⏳ Матч еще не завершен: {home_name} vs {away_name}")
                continue

            home_win = home_score > away_score
            home_stats = detailed_stats.get('home', {})
            away_stats = detailed_stats.get('away', {})

            def safe_pct(made, att):
                return round(made / att, 3) if att and att > 0 else 0

            # Исправленный UPDATE запрос - используем %s вместо :param
            try:
                cursor.execute("""
                    UPDATE game SET
                        pts_home = %s, 
                        pts_away = %s,
                        wl_home = %s, 
                        wl_away = %s,
                        fgm_home = %s, 
                        fga_home = %s, 
                        fg_pct_home = %s,
                        fg3m_home = %s, 
                        fg3a_home = %s, 
                        fg3_pct_home = %s,
                        ftm_home = %s, 
                        fta_home = %s, 
                        ft_pct_home = %s,
                        oreb_home = %s, 
                        dreb_home = %s, 
                        reb_home = %s,
                        ast_home = %s, 
                        stl_home = %s, 
                        blk_home = %s,
                        tov_home = %s, 
                        pf_home = %s,
                        fgm_away = %s, 
                        fga_away = %s, 
                        fg_pct_away = %s,
                        fg3m_away = %s, 
                        fg3a_away = %s, 
                        fg3_pct_away = %s,
                        ftm_away = %s, 
                        fta_away = %s, 
                        ft_pct_away = %s,
                        oreb_away = %s, 
                        dreb_away = %s, 
                        reb_away = %s,
                        ast_away = %s, 
                        stl_away = %s, 
                        blk_away = %s,
                        tov_away = %s, 
                        pf_away = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE game_id = %s
                """, (
                    home_score, away_score,
                    'W' if home_win else 'L', 'L' if home_win else 'W',
                    home_stats.get('fieldGoalsMade', 0),
                    home_stats.get('fieldGoalsAttempted', 0),
                    safe_pct(home_stats.get('fieldGoalsMade', 0), home_stats.get('fieldGoalsAttempted', 0)),
                    home_stats.get('threePointFieldGoalsMade', 0),
                    home_stats.get('threePointFieldGoalsAttempted', 0),
                    safe_pct(home_stats.get('threePointFieldGoalsMade', 0), home_stats.get('threePointFieldGoalsAttempted', 0)),
                    home_stats.get('freeThrowsMade', 0),
                    home_stats.get('freeThrowsAttempted', 0),
                    safe_pct(home_stats.get('freeThrowsMade', 0), home_stats.get('freeThrowsAttempted', 0)),
                    home_stats.get('offensiveRebounds', 0),
                    home_stats.get('defensiveRebounds', 0),
                    home_stats.get('rebounds', 0),
                    home_stats.get('assists', 0),
                    home_stats.get('steals', 0),
                    home_stats.get('blocks', 0),
                    home_stats.get('turnovers', 0),
                    home_stats.get('fouls', 0),
                    away_stats.get('fieldGoalsMade', 0),
                    away_stats.get('fieldGoalsAttempted', 0),
                    safe_pct(away_stats.get('fieldGoalsMade', 0), away_stats.get('fieldGoalsAttempted', 0)),
                    away_stats.get('threePointFieldGoalsMade', 0),
                    away_stats.get('threePointFieldGoalsAttempted', 0),
                    safe_pct(away_stats.get('threePointFieldGoalsMade', 0), away_stats.get('threePointFieldGoalsAttempted', 0)),
                    away_stats.get('freeThrowsMade', 0),
                    away_stats.get('freeThrowsAttempted', 0),
                    safe_pct(away_stats.get('freeThrowsMade', 0), away_stats.get('freeThrowsAttempted', 0)),
                    away_stats.get('offensiveRebounds', 0),
                    away_stats.get('defensiveRebounds', 0),
                    away_stats.get('rebounds', 0),
                    away_stats.get('assists', 0),
                    away_stats.get('steals', 0),
                    away_stats.get('blocks', 0),
                    away_stats.get('turnovers', 0),
                    away_stats.get('fouls', 0),
                    game_data["game_id"]
                ))

                if cursor.rowcount > 0:
                    updated_count += 1
                    print(f"      ✅ Обновлен результат: {home_name} {home_score} - {away_score} {away_name}")
                else:
                    already_finished += 1

            except Exception as e:
                print(f"      ❌ Ошибка обновления: {e}")

        conn.commit()

    print(f"\n📊 СТАТИСТИКА ОБНОВЛЕНИЯ:")
    print(f"   • Обновлено результатов: {updated_count}")
    print(f"   • Уже были завершены: {already_finished}")
    print(f"   • Всего проверено матчей: {updated_count + already_finished}")

    return updated_count

# Парсит данные с api и приводит их к структуре как в базе

def parse_espn_game(event, team_id_map):
    try:
        game_id = event['id']
        game_date = datetime.strptime(event['date'], "%Y-%m-%dT%H:%MZ")

        competitions = event.get('competitions', [{}])[0]
        competitors = competitions.get('competitors', [])
        if len(competitors) < 2:
            return None

        away_competitor = competitors[0]
        home_competitor = competitors[1]
        away_team_name = away_competitor.get('team', {}).get('displayName', '')
        home_team_name = home_competitor.get('team', {}).get('displayName', '')

        if is_special_game(away_team_name, home_team_name):
            return None

        away_abbrev = TEAM_NAME_MAP.get(away_team_name)
        home_abbrev = TEAM_NAME_MAP.get(home_team_name)
        if not away_abbrev or not home_abbrev:
            return None

        away_id = team_id_map.get(away_abbrev)
        home_id = team_id_map.get(home_abbrev)
        if not away_id or not home_id:
            return None

        away_score = int(away_competitor.get('score', 0))
        home_score = int(home_competitor.get('score', 0))
        home_win = home_score > away_score

        detailed_stats = fetch_detailed_stats(game_id)
        home_stats = detailed_stats.get('home', {}) if detailed_stats else {}
        away_stats = detailed_stats.get('away', {}) if detailed_stats else {}

        def safe_pct(made, att):
            return round(made / att, 3) if att and att > 0 else 0

        return {
            'game_id': f"ESPN_{game_id}",
            'game_date': game_date.strftime("%Y-%m-%d %H:%M:%S"),
            'season_id': f"2{game_date.year - 1 if game_date.month < 10 else game_date.year}",
            'season_type': 'Regular Season',
            'team_id_home': home_id,
            'team_abbreviation_home': home_abbrev,
            'team_name_home': home_team_name,
            'matchup_home': f"{home_abbrev} vs. {away_abbrev}",
            'wl_home': 'W' if home_win else 'L' if home_score > 0 else None,
            'pts_home': home_score if home_score > 0 else None,
            'team_id_away': away_id,
            'team_abbreviation_away': away_abbrev,
            'team_name_away': away_team_name,
            'matchup_away': f"{away_abbrev} @ {home_abbrev}",
            'wl_away': 'L' if home_win else 'W' if away_score > 0 else None,
            'pts_away': away_score if away_score > 0 else None,
            'fgm_home': home_stats.get('fieldGoalsMade', 0),
            'fga_home': home_stats.get('fieldGoalsAttempted', 0),
            'fg_pct_home': safe_pct(home_stats.get('fieldGoalsMade', 0), home_stats.get('fieldGoalsAttempted', 0)),
            'fg3m_home': home_stats.get('threePointFieldGoalsMade', 0),
            'fg3a_home': home_stats.get('threePointFieldGoalsAttempted', 0),
            'fg3_pct_home': safe_pct(home_stats.get('threePointFieldGoalsMade', 0),
                                     home_stats.get('threePointFieldGoalsAttempted', 0)),
            'ftm_home': home_stats.get('freeThrowsMade', 0),
            'fta_home': home_stats.get('freeThrowsAttempted', 0),
            'ft_pct_home': safe_pct(home_stats.get('freeThrowsMade', 0), home_stats.get('freeThrowsAttempted', 0)),
            'oreb_home': home_stats.get('offensiveRebounds', 0),
            'dreb_home': home_stats.get('defensiveRebounds', 0),
            'reb_home': home_stats.get('rebounds', 0),
            'ast_home': home_stats.get('assists', 0),
            'stl_home': home_stats.get('steals', 0),
            'blk_home': home_stats.get('blocks', 0),
            'tov_home': home_stats.get('turnovers', 0),
            'pf_home': home_stats.get('fouls', 0),
            'fgm_away': away_stats.get('fieldGoalsMade', 0),
            'fga_away': away_stats.get('fieldGoalsAttempted', 0),
            'fg_pct_away': safe_pct(away_stats.get('fieldGoalsMade', 0), away_stats.get('fieldGoalsAttempted', 0)),
            'fg3m_away': away_stats.get('threePointFieldGoalsMade', 0),
            'fg3a_away': away_stats.get('threePointFieldGoalsAttempted', 0),
            'fg3_pct_away': safe_pct(away_stats.get('threePointFieldGoalsMade', 0),
                                     away_stats.get('threePointFieldGoalsAttempted', 0)),
            'ftm_away': away_stats.get('freeThrowsMade', 0),
            'fta_away': away_stats.get('freeThrowsAttempted', 0),
            'ft_pct_away': safe_pct(away_stats.get('freeThrowsMade', 0), away_stats.get('freeThrowsAttempted', 0)),
            'oreb_away': away_stats.get('offensiveRebounds', 0),
            'dreb_away': away_stats.get('defensiveRebounds', 0),
            'reb_away': away_stats.get('rebounds', 0),
            'ast_away': away_stats.get('assists', 0),
            'stl_away': away_stats.get('steals', 0),
            'blk_away': away_stats.get('blocks', 0),
            'tov_away': away_stats.get('turnovers', 0),
            'pf_away': away_stats.get('fouls', 0),
            'min': 240,
            'plus_minus_home': 0,
            'plus_minus_away': 0,
            'video_available_home': 0,
            'video_available_away': 0
        }
    except Exception as e:
        return None


def game_exists(conn, game_id):
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM game WHERE game_id = %s", (game_id,))
    exists = cursor.fetchone() is not None
    cursor.close()
    return exists


def insert_game(conn, game):
    cursor = conn.cursor()
    if game_exists(conn, game['game_id']):
        return False

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

# Обновляет данные для scheduled матчей и затем добавляет новые матчи
def update_db_with_new_games(db_path=None, days_back=2):
    print(f"\n{'=' * 60}")
    print(f"🔄 ОБНОВЛЕНИЕ БАЗЫ ДАННЫХ")
    print(f"📅 За последние {days_back} дней")
    print(f"⏰ Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'=' * 60}")

    conn = get_db_connection()
    print(f"✅ Подключение к БД установлено")

    # Обновляем результаты существующих матчей (scheduled -> finished)
    updated_results = update_existing_games(conn, days_back)

    # Добавляем новые матчи (которых еще нет в БД)
    print(f"\n{'=' * 60}")
    print("➕ ДОБАВЛЕНИЕ НОВЫХ МАТЧЕЙ")
    print(f"{'=' * 60}")

    team_id_map = get_team_id_map(conn)
    today = datetime.now().date()
    new_count = 0
    failed_count = 0
    skipped_count = 0

    for i in range(days_back):
        date = today - timedelta(days=i)
        events = fetch_espn_games(date)

        for event in events:
            game_record = parse_espn_game(event, team_id_map)
            if game_record is None:
                failed_count += 1
            elif insert_game(conn, game_record):
                new_count += 1
                print(
                    f"  ✅ Добавлен: {game_record['team_abbreviation_away']} @ {game_record['team_abbreviation_home']}")
            else:
                skipped_count += 1
            time.sleep(0.5)

        if i < days_back - 1:
            time.sleep(2)

    conn.close()

    print(f"\n{'=' * 60}")
    print(f"📊 ИТОГОВАЯ СТАТИСТИКА ОБНОВЛЕНИЯ:")
    print(f"   • Обновлено результатов (scheduled -> finished): {updated_results}")
    print(f"   • Добавлено новых матчей: {new_count}")
    print(f"   • Не удалось добавить: {failed_count}")
    print(f"   • Пропущено (уже есть): {skipped_count}")
    print(f"{'=' * 60}")

    return {
        "updated_results": updated_results,
        "new_games": new_count,
        "failed": failed_count,
        "skipped": skipped_count
    }


if __name__ == "__main__":
    update_db_with_new_games(days_back=2)