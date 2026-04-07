import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd
import numpy as np
from datetime import datetime
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.preprocessing import StandardScaler
import pickle
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / 'env'

print(f"Поиск env файла по пути: {env_path}")

if env_path.exists():
    load_dotenv(env_path)
    print("env файл загружен")
else:
    print("env файл не найден!")

DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

# Директория для сохранения моделей

MODEL_DIR = BASE_DIR / "models"
os.makedirs(MODEL_DIR, exist_ok=True)

# Проверка наличия всех необходимых параметров

if not all([DB_NAME, DB_USER, DB_PASSWORD]):
    print("\nОШИБКА: Не все параметры БД заданы!")
    sys.exit(1)

# Альтернативный путь для моделей из env

MODEL_DIR = os.getenv("MODEL_DIR", str(BASE_DIR / "models"))
os.makedirs(MODEL_DIR, exist_ok=True)

# Список статистических показателей для анализа

STATS = [
    'pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'pf',
    'fg_pct', 'fg3_pct', 'ft_pct'
]

# Параметры экспоненциального сглаживания (EMA)

ALPHA = 0.18  # Коэффициент сглаживания
WEIGHT_DECAY_DAYS = 500  # Период полураспада весов (в днях)


def get_db_connection():
    print(f"\nПопытка подключения к БД...")
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            cursor_factory=RealDictCursor
        )
        print("Подключение успешно!")
        return conn
    except Exception as e:
        print(f"Ошибка подключения: {e}")
        raise

# Парсер дат
def safe_parse_date(date_val):
    if pd.isna(date_val) or date_val is None:
        return None

    try:
        # Если это уже datetime, возвращаем как есть
        if isinstance(date_val, datetime):
            return date_val

        # Если это строка
        if isinstance(date_val, str):
            date_val = date_val.strip()

            # Проверяем, что это не название колонки
            if date_val.lower() == 'game_date':
                return None

            if ' ' in date_val and '-' in date_val:
                return datetime.strptime(date_val, "%Y-%m-%d %H:%M:%S")

            elif '-' in date_val and len(date_val) == 10:
                return datetime.strptime(date_val, "%Y-%m-%d")

            else:
                return pd.to_datetime(date_val)

        return None
    except Exception as e:
        print(f"Не удалось распарсить дату '{date_val}': {e}")
        return None

# Возвращает фрейм данных с играми, отсортированными по дате

def load_games():
    conn = get_db_connection()

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM game ORDER BY game_date")

    colnames = [desc[0] for desc in cursor.description]
    print(f"Колонки: {colnames[:10]}")

    rows = cursor.fetchall()
    print(f"Загружено {len(rows)} строк из бд")

    df = pd.DataFrame(rows, columns=colnames)

    cursor.close()
    conn.close()

    print(f"Размер фрейма данных: {df.shape}")

    print("\nПервые 5 значений game_date:")
    sample_dates = df['game_date'].head()
    for i, val in enumerate(sample_dates):
        print(f"  {i}: '{val}' (тип: {type(val)})")

    df['game_date_parsed'] = df['game_date'].apply(safe_parse_date)
    success_count = df['game_date_parsed'].notna().sum()

    if success_count == 0:
        print("Нет распаршенных дат")
        return pd.DataFrame()

    before = len(df)
    df = df.dropna(subset=['game_date_parsed'])
    after = len(df)

    if before > after:
        print(f"Удалено {before - after} строк с некорректными датами")

    df['game_date'] = df['game_date_parsed']
    df = df.drop(columns=['game_date_parsed'])
    df = df.sort_values('game_date').reset_index(drop=True)

    if len(df) > 0:
        print(f"Диапазон дат: {df['game_date'].min()} - {df['game_date'].max()}")
        print(f"Итоговое количество игр: {len(df)}")

    return df

    '''    
    Вычисляет глобальные средние значения для всех статистических показателей
    Используется для инициализации EMA новых команд
    '''

def compute_global_averages(df):
    global_avg = {}
    for stat in STATS:
        home_col = f'{stat}_home'
        away_col = f'{stat}_away'
        values = []

        if home_col in df.columns:
            values.append(pd.to_numeric(df[home_col], errors='coerce'))
        if away_col in df.columns:
            values.append(pd.to_numeric(df[away_col], errors='coerce'))

        if values:
            combined = pd.concat(values, ignore_index=True).dropna()
            if not combined.empty:
                global_avg[stat] = combined.mean()
            else:
                global_avg[stat] = 0.0
        else:
            global_avg[stat] = 0.0
    return global_avg

    '''    
    Предобработка данных и построение датасета для обучения

    Создает признаки на основе EMA (экспоненциального скользящего среднего)
    для каждой команды и целевую переменную (победа хозяев: 1/0)
    '''

def preprocess_and_build_dataset(df):
    print("Предобработка данных...")

    for stat in STATS:
        home_col = f'{stat}_home'
        away_col = f'{stat}_away'

        if home_col in df.columns:
            df[home_col] = pd.to_numeric(df[home_col], errors='coerce').fillna(0)
        else:
            df[home_col] = 0

        if away_col in df.columns:
            df[away_col] = pd.to_numeric(df[away_col], errors='coerce').fillna(0)
        else:
            df[away_col] = 0

    global_avg = compute_global_averages(df)
    print(f"Глобальные средние: {global_avg}")

    features = []
    targets = []
    weights = []
    game_dates = []
    team_emas = {}

    last_date = df['game_date'].max()
    print(f"Последняя дата в данных: {last_date}")

    print("Построение сета данных...")
    total_games = len(df)

    for idx, row in df.iterrows():
        if idx % 10000 == 0:
            print(f"  ... обработано {idx}/{total_games} игр")

        home_id = str(row['team_id_home'])
        away_id = str(row['team_id_away'])
        game_date = row['game_date']

        if home_id not in team_emas:
            team_emas[home_id] = global_avg.copy()
        if away_id not in team_emas:
            team_emas[away_id] = global_avg.copy()

        home_ema = team_emas[home_id]
        away_ema = team_emas[away_id]

        feat = []
        for stat in STATS:
            feat.append(home_ema[stat])
        for stat in STATS:
            feat.append(away_ema[stat])
        features.append(feat)

        target = 1 if row['wl_home'] == 'W' else 0
        targets.append(target)

        days_old = (last_date - game_date).days
        weight = np.exp(-days_old / WEIGHT_DECAY_DAYS)
        weights.append(weight)
        game_dates.append(game_date)

        actual_home = {}
        for stat in STATS:
            col = f'{stat}_home'
            val = row[col] if col in row else 0
            actual_home[stat] = float(val) if pd.notna(val) else 0

        new_home_ema = {}
        for stat in STATS:
            new_home_ema[stat] = ALPHA * actual_home[stat] + (1 - ALPHA) * home_ema[stat]
        team_emas[home_id] = new_home_ema

        actual_away = {}
        for stat in STATS:
            col = f'{stat}_away'
            val = row[col] if col in row else 0
            actual_away[stat] = float(val) if pd.notna(val) else 0

        new_away_ema = {}
        for stat in STATS:
            new_away_ema[stat] = ALPHA * actual_away[stat] + (1 - ALPHA) * away_ema[stat]
        team_emas[away_id] = new_away_ema

    X = np.array(features, dtype=np.float32)
    y = np.array(targets, dtype=np.float32)
    weights = np.array(weights, dtype=np.float32)

    print(f"Создан датасет: {X.shape[0]} примеров, {X.shape[1]} признаков")
    print(f"Соотношение классов: {np.mean(y):.3f} (доля побед хозяев)")

    return X, y, weights, team_emas, game_dates

    '''  
    Создает нейронную сеть для бинарной классификации

    Архитектура:
    - Входной слой: input_dim нейронов
    - Скрытые слои: 64 -> 32 -> 16 нейронов (ReLU)
    - Dropout для предотвращения переобучения (30%)
    - Выходной слой: 1 нейрон (sigmoid для вероятности)
    '''

def build_model(input_dim):
    model = keras.Sequential([
        layers.Dense(64, activation='relu', input_shape=(input_dim,)),
        layers.Dropout(0.3),
        layers.Dense(32, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(16, activation='relu'),
        layers.Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

    ''' 
    Основная функция обучения модели

    Этапы:
    1. Загрузка данных из БД
    2. Предобработка и построение датасета
    3. Разделение на обучающую и валидационную выборки
    4. Масштабирование признаков
    5. Создание и обучение нейронной сети
    6. Сохранение модели и артефактов
    '''

def train_model(db_path=None):
    print("Запуск обучения модели")

    print("Загрузка данных")
    df = load_games()
    print(f"Всего игр: {len(df)}")

    if len(df) == 0:
        print("Нет данных для обучения")
        return None, None, None

    X, y, weights, team_emas, game_dates = preprocess_and_build_dataset(df)

    split_idx = int(0.8 * len(X))
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    w_train, w_val = weights[:split_idx], weights[split_idx:]

    print(f"Обучающая выборка: {len(X_train)} примеров")
    print(f"Валидационная выборка: {len(X_val)} примеров")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    model = build_model(X.shape[1])
    model.summary()

    print("Начало обучения...")
    history = model.fit(
        X_train_scaled, y_train,
        sample_weight=w_train,
        validation_data=(X_val_scaled, y_val, w_val),
        epochs=30,
        batch_size=64,
        verbose=1
    )

    val_loss, val_acc = model.evaluate(X_val_scaled, y_val, sample_weight=w_val)
    print(f"Точность валидации: {val_acc:.4f}")

    model_path = os.path.join(MODEL_DIR, "model.h5")
    scaler_path = os.path.join(MODEL_DIR, "scaler.pkl")
    emas_path = os.path.join(MODEL_DIR, "team_emas.pkl")

    model.save(model_path)
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    with open(emas_path, "wb") as f:
        pickle.dump(team_emas, f)

    conn = get_db_connection()
    teams_df = pd.read_sql_query("""
        SELECT DISTINCT 
            team_id_home as team_id, 
            team_name_home as team_name, 
            team_abbreviation_home as team_abbrev 
        FROM game 
        WHERE team_id_home IS NOT NULL
    """, conn)
    conn.close()

    teams_path = os.path.join(MODEL_DIR, "teams.csv")
    teams_df.to_csv(teams_path, index=False)

    print(f"Модель и артефакты сохранены в {MODEL_DIR}")
    return model, scaler, team_emas


if __name__ == "__main__":
    train_model()