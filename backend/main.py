from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd
import pickle
import os
import asyncio
try:
    from tensorflow.keras.models import load_model
    TF_AVAILABLE = True
except (ImportError, ModuleNotFoundError):
    print("TensorFlow not found. AI predictions will be disabled.")
    TF_AVAILABLE = False
import sqlite3
from datetime import datetime
from typing import List, Optional
import json
import traceback
from fastapi.responses import JSONResponse

# Импортируем контроллеры из папки controllers
from controllers import auth, teams, matches, predictions, players

# Импортируем функции из скриптов
from scripts.update_data import update_db_with_new_games
from scripts.train_model import train_model

# Импортируем database и модели
from database import engine, Base
import models

app = FastAPI(
    title="HoopsAI API",
    description="API для прогнозирования баскетбольных матчей",
    version="1.0.0"
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    with open("error_traceback.txt", "w") as f:
        f.write(traceback.format_exc())
    return JSONResponse(status_code=500, content={"message": "Internal Server Error"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",  # Vite порт
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы (GET, POST, OPTIONS и т.д.)
    allow_headers=["*"],  # Разрешаем все заголовки
)
# ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ НЕЙРОСЕТИ ==========
model = None
scaler = None
team_emas = {}
teams_df = None
STATS = ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'pf', 'fg_pct', 'fg3_pct', 'ft_pct']
MODEL_DIR = "./models"
DB_PATH = "./nba.sqlite"


# ========== МОДЕЛИ ДЛЯ НЕЙРОСЕТИ ==========
class NeuralPredictionRequest(BaseModel):
    home_team: str
    away_team: str


class NeuralPredictionResponse(BaseModel):
    home_team: str
    away_team: str
    home_win_probability: float


# ========== ЗАГРУЗКА НЕЙРОСЕТИ ПРИ СТАРТЕ ==========
@app.on_event("startup")
def startup_event():
    # Создаем таблицы в БД при запуске
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Таблицы в базе данных созданы успешно")
    except Exception as e:
        print(f"❌ Ошибка создания таблиц в БД: {e}")

    global model, scaler, team_emas, teams_df
    model_path = os.path.join(MODEL_DIR, "model.h5")
    scaler_path = os.path.join(MODEL_DIR, "scaler.pkl")
    emas_path = os.path.join(MODEL_DIR, "team_emas.pkl")
    teams_path = os.path.join(MODEL_DIR, "teams.csv")

    if os.path.exists(model_path):
        try:
            model = load_model(model_path)
            with open(scaler_path, "rb") as f:
                scaler = pickle.load(f)
            with open(emas_path, "rb") as f:
                team_emas = pickle.load(f)
            if os.path.exists(teams_path):
                teams_df = pd.read_csv(teams_path)
            print("✅ Нейросеть загружена успешно")
        except Exception as e:
            print(f"⚠️ Ошибка загрузки нейросети: {e}")
    else:
        print("⚠️ Нейросеть не найдена. Сначала запустите train_model.py")


# ========== ЭНДПОИНТЫ ДЛЯ НЕЙРОСЕТИ ==========
@app.get("/api/neural/teams")
def get_neural_teams():
    """Список команд для нейросети"""
    if teams_df is None:
        raise HTTPException(status_code=503, detail="Нейросеть не загружена")
    return teams_df[['team_abbrev', 'team_name']].drop_duplicates().to_dict(orient='records')


@app.post("/api/neural/predict", response_model=NeuralPredictionResponse)
def neural_predict(request: NeuralPredictionRequest):
    """Предсказание от нейросети"""
    if model is None or scaler is None or teams_df is None:
        raise HTTPException(status_code=503, detail="Нейросеть не загружена")

    home_row = teams_df[teams_df['team_abbrev'] == request.home_team]
    away_row = teams_df[teams_df['team_abbrev'] == request.away_team]

    if home_row.empty or away_row.empty:
        raise HTTPException(status_code=404, detail="Команда не найдена")

    home_id = str(home_row.iloc[0]['team_id'])
    away_id = str(away_row.iloc[0]['team_id'])

    if home_id not in team_emas or away_id not in team_emas:
        raise HTTPException(status_code=404, detail="Данные команды недоступны")

    home_ema = team_emas[home_id]
    away_ema = team_emas[away_id]

    feat = []
    for stat in STATS:
        feat.append(home_ema[stat])
    for stat in STATS:
        feat.append(away_ema[stat])

    feat_array = np.array(feat).reshape(1, -1)
    feat_scaled = scaler.transform(feat_array)
    prob = model.predict(feat_scaled)[0][0]

    return NeuralPredictionResponse(
        home_team=request.home_team,
        away_team=request.away_team,
        home_win_probability=float(prob)
    )


@app.post("/api/neural/retrain")
async def neural_retrain(background_tasks: BackgroundTasks):
    """Переобучение нейросети в фоне"""
    background_tasks.add_task(retrain_task)
    return {"message": "Переобучение запущено в фоне. Это может занять несколько минут."}


async def retrain_task():
    """Фоновая задача для переобучения"""
    try:
        loop = asyncio.get_event_loop()
        print("🔄 Начало обновления данных...")
        await loop.run_in_executor(None, update_db_with_new_games, DB_PATH, 7)
        print("✅ Данные обновлены. Начало обучения модели...")
        await loop.run_in_executor(None, train_model, DB_PATH)
        print("✅ Модель обучена. Перезагрузка артефактов...")
        load_artifacts()
        print("✅ Переобучение завершено успешно")
    except Exception as e:
        print(f"❌ Ошибка при переобучении: {e}")


# ========== HEALTH CHECK ==========
@app.get("/api/health")
async def health_check():
    return {
        "status": "OK",
        "timestamp": datetime.now().isoformat(),
        "neural_loaded": model is not None,
        "service": "HoopsAI API"
    }


# ========== ПОДКЛЮЧАЕМ КОНТРОЛЛЕРЫ ==========
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(players.router, prefix="/api/players", tags=["players"])
app.include_router(matches.router, prefix="/api/matches", tags=["matches"])
app.include_router(predictions.router, prefix="/api", tags=["predictions"])

# Для обратной совместимости (без /api)
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(teams.router, prefix="/teams", tags=["teams"])
app.include_router(players.router, prefix="/players", tags=["players"])
app.include_router(matches.router, prefix="/matches", tags=["matches"])
app.include_router(predictions.router, prefix="", tags=["predictions"])


# ========== КОРНЕВОЙ ЭНДПОИНТ ==========
@app.get("/")
async def root():
    return {
        "message": "HoopsAI API работает!",
        "version": "1.0.0",
        "neural_loaded": model is not None,
        "endpoints": {
            "health": "/api/health",
            "neural": {
                "teams": "/api/neural/teams",
                "predict": "POST /api/neural/predict",
                "retrain": "POST /api/neural/retrain"
            },
            "auth": {
                "register": "POST /api/auth/register",
                "login": "POST /api/auth/login",
                "me": "GET /api/auth/me",
                "init": "POST /api/auth/init"
            },
            "teams": {
                "all": "GET /api/teams",
                "by_id": "GET /api/teams/{id}"
            },
            "matches": {
                "all": "GET /api/matches",
                "by_id": "GET /api/matches/{id}"
            },
            "predictions": {
                "predict": "POST /api/predict",
                "my": "GET /api/predictions/my",
                "by_id": "GET /api/predictions/{id}",
                "evaluate": "GET /api/predict/evaluate",
                "stats": "GET /api/predict/stats"
            }
        },
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=False
    )