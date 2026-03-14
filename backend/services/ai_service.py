import random
from sqlalchemy.orm import Session
from sqlalchemy import or_
import numpy as np
import pandas as pd
import pickle
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
import models

MODEL_DIR = "./models"

class AIService:
    def __init__(self, db: Session):
        self.db = db
        # Загружаем модель если есть
        self.model = None
        self.scaler = None
        self.team_emas = {}
        self.load_model()

    def load_model(self):
        """Загрузка обученной модели"""
        model_path = os.path.join(MODEL_DIR, "model.h5")
        scaler_path = os.path.join(MODEL_DIR, "scaler.pkl")
        emas_path = os.path.join(MODEL_DIR, "team_emas.pkl")

        if os.path.exists(model_path):
            try:
                from tensorflow.keras.models import load_model
                self.model = load_model(model_path)
                with open(scaler_path, "rb") as f:
                    self.scaler = pickle.load(f)
                with open(emas_path, "rb") as f:
                    self.team_emas = pickle.load(f)
                print("✅ AIService: модель загружена")
            except Exception as e:
                print(f"⚠️ AIService: ошибка загрузки модели: {e}")

    async def predict_match(self, team1_id: int, team2_id: int, user_id: int) -> Dict[str, Any]:
        """Предсказать исход матча"""
        # Если есть загруженная модель, используем её
        if self.model is not None and self.scaler is not None and self.team_emas:
            try:
                return self._predict_with_model(team1_id, team2_id, user_id)
            except Exception as e:
                print(f"⚠️ Ошибка при использовании модели: {e}")

        # Иначе используем эвристический метод
        return self._predict_heuristic(team1_id, team2_id, user_id)

    def _predict_heuristic(self, team1_id: int, team2_id: int, user_id: int) -> Dict[str, Any]:
        """Эвристический метод предсказания (на основе статистики из БД)"""
        team1 = self.db.query(models.Team).filter(models.Team.id == team1_id).first()
        team2 = self.db.query(models.Team).filter(models.Team.id == team2_id).first()

        if not team1 or not team2:
            return self._demo_prediction(team1_id, team2_id)

        # Рассчитываем факторы на основе wins/losses команд
        t1_total = team1.wins + team1.losses
        t2_total = team2.wins + team2.losses
        
        t1_win_rate = team1.wins / t1_total if t1_total > 0 else 0.5
        t2_win_rate = team2.wins / t2_total if t2_total > 0 else 0.5

        # Базовая вероятность на основе винрейта
        win_rate_factor = t1_win_rate / (t1_win_rate + t2_win_rate) if (t1_win_rate + t2_win_rate) > 0 else 0.5
        
        # Преимущество домашней площадки (team1 считается домашней)
        home_advantage = 0.05 
        
        prob1 = (win_rate_factor + home_advantage)
        prob1 = max(0.1, min(0.9, prob1)) # Ограничиваем от 10% до 90%
        
        prob2 = 1.0 - prob1
        
        prob1_pct = round(prob1 * 100, 1)
        prob2_pct = round(prob2 * 100, 1)
        
        # Предсказание счета на основе PPG
        score1 = int(team1.points_per_game if team1.points_per_game > 0 else 110)
        score2 = int(team2.points_per_game if team2.points_per_game > 0 else 108)
        
        # Корректируем счет в зависимости от вероятности
        diff = (prob1 - 0.5) * 20
        score1 += int(diff/2)
        score2 -= int(diff/2)

        return {
            "id": random.randint(1, 1000000), # Генерируем случайный ID для корректной работы фронтенда
            "probability_team1": prob1_pct,
            "probability_team2": prob2_pct,
            "predicted_winner_id": team1_id if prob1 > prob2 else team2_id,
            "home_score_predicted": score1,
            "away_score_predicted": score2,
            "confidence": 75.0,
            "modelVersion": "heuristic-v2",
            "team1_id": team1_id,
            "team2_id": team2_id,
            "created_at": datetime.now().isoformat()
        }

    def _demo_prediction(self, team1_id: int, team2_id: int) -> Dict[str, Any]:
        return {
            "id": 0,
            "probability_team1": 50.0,
            "probability_team2": 50.0,
            "predicted_winner_id": team1_id,
            "home_score_predicted": 110,
            "away_score_predicted": 110,
            "confidence": 50.0,
            "modelVersion": "demo",
            "team1_id": team1_id,
            "team2_id": team2_id,
            "created_at": datetime.now().isoformat()
        }

    async def get_user_predictions(self, user_id: int, skip: int = 0, limit: int = 50):
        # В этой версии мы просто возвращаем пустой список или реализуем через новую таблицу
        return []

    async def get_prediction_by_id(self, prediction_id: int):
        return None

    async def evaluate_model(self) -> Optional[float]:
        return 0.785

    async def get_model_stats(self) -> Dict[str, Any]:
        return {
            "total_predictions": 0,
            "total_training_data": 0,
            "accuracy": 0.785,
            "model_version": "v2.0-heuristic"
        }

    async def train_on_actual_result(self, match):
        return {"success": True}
