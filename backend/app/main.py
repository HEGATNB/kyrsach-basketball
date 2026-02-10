from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend is running 🚀"}

# Временные роуты без БД
teams = [
    {"id": 1, "name": "Лейкерс", "city": "Лос-Анджелес"},
    {"id": 2, "name": "Уорриорз", "city": "Сан-Франциско"}
]

@app.get("/teams/")
def get_teams():
    return teams

@app.get("/predict/")
def predict_match(home_team_id: int = 1, guest_team_id: int = 2):
    import random
    home_prob = random.randint(30, 90)
    return {
        "home_team_win_probability": home_prob,
        "guest_team_win_probability": 100 - home_prob
    }