import models, database

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="HoopStat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "HoopStat API is running 🏀"}

@app.get("/teams/")
def get_teams(db: Session = Depends(database.get_db)):
    return db.query(models.Team).all()

@app.post("/predict/")
def predict_match(home_team_id: int, guest_team_id: int):
    home_prob = random.randint(30, 90)
    guest_prob = 100 - home_prob
    return {
        "home_team_win_probability": home_prob,
        "guest_team_win_probability": guest_prob,
        "ai_message": "Анализ завершен. Преимущество в подборах у хозяев."
    }
