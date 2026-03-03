from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
from scripts.auth import get_password_hash

def seed():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Create admin user
    admin_user = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin_user:
        admin_user = models.User(
            email="admin@example.com",
            username="admin",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin_user)
    else:
        admin_user.hashed_password = get_password_hash("admin123")
    
    # Teams
    teams_data = [
        {"name": "Boston Celtics", "abbrev": "BOS", "full_name": "Boston Celtics", "city": "Boston", "arena": "TD Garden", "founded_year": 1946, "championships": 18, "wins": 64, "losses": 18, "points_per_game": 120.6, "points_against": 109.2},
        {"name": "Los Angeles Lakers", "abbrev": "LAL", "full_name": "Los Angeles Lakers", "city": "Los Angeles", "arena": "Crypto.com Arena", "founded_year": 1947, "championships": 17, "wins": 47, "losses": 35, "points_per_game": 118.0, "points_against": 117.4},
        {"name": "Golden State Warriors", "abbrev": "GSW", "full_name": "Golden State Warriors", "city": "San Francisco", "arena": "Chase Center", "founded_year": 1946, "championships": 7, "wins": 46, "losses": 36, "points_per_game": 117.8, "points_against": 115.2},
        {"name": "Milwaukee Bucks", "abbrev": "MIL", "full_name": "Milwaukee Bucks", "city": "Milwaukee", "arena": "Fiserv Forum", "founded_year": 1968, "championships": 2, "wins": 49, "losses": 33, "points_per_game": 119.0, "points_against": 116.4},
        {"name": "Denver Nuggets", "abbrev": "DEN", "full_name": "Denver Nuggets", "city": "Denver", "arena": "Ball Arena", "founded_year": 1967, "championships": 1, "wins": 57, "losses": 25, "points_per_game": 114.9, "points_against": 109.6},
        {"name": "Miami Heat", "abbrev": "MIA", "full_name": "Miami Heat", "city": "Miami", "arena": "Kaseya Center", "founded_year": 1988, "championships": 3, "wins": 46, "losses": 36, "points_per_game": 110.1, "points_against": 108.4},
        {"name": "Chicago Bulls", "abbrev": "CHI", "full_name": "Chicago Bulls", "city": "Chicago", "arena": "United Center", "founded_year": 1966, "championships": 6, "wins": 39, "losses": 43, "points_per_game": 112.3, "points_against": 113.7},
    ]
    
    for t in teams_data:
        existing = db.query(models.Team).filter(models.Team.abbrev == t["abbrev"]).first()
        if not existing:
            team = models.Team(**t, conference_id=1, division_id=1) # Default values for required fields
            db.add(team)
        else:
            for key, value in t.items():
                setattr(existing, key, value)
    
    db.commit()
    
    # Players
    players_data = [
        {"first_name": "Jayson", "last_name": "Tatum", "number": 0, "position": "F", "team_abbrev": "BOS", "points_per_game": 26.9, "rebounds_per_game": 8.1, "assists_per_game": 4.9},
        {"first_name": "LeBron", "last_name": "James", "number": 23, "position": "F", "team_abbrev": "LAL", "points_per_game": 25.7, "rebounds_per_game": 7.3, "assists_per_game": 8.3},
        {"first_name": "Stephen", "last_name": "Curry", "number": 30, "position": "G", "team_abbrev": "GSW", "points_per_game": 26.4, "rebounds_per_game": 4.5, "assists_per_game": 5.1},
        {"first_name": "Giannis", "last_name": "Antetokounmpo", "number": 34, "position": "F", "team_abbrev": "MIL", "points_per_game": 30.4, "rebounds_per_game": 11.5, "assists_per_game": 6.5},
        {"first_name": "Nikola", "last_name": "Jokic", "number": 15, "position": "C", "team_abbrev": "DEN", "points_per_game": 26.4, "rebounds_per_game": 12.4, "assists_per_game": 9.0},
    ]
    
    for p in players_data:
        team_abbrev = p.pop("team_abbrev")
        team = db.query(models.Team).filter(models.Team.abbrev == team_abbrev).first()
        if team:
            p["team_id"] = team.id
            existing = db.query(models.Player).filter(models.Player.last_name == p["last_name"], models.Player.first_name == p["first_name"]).first()
            if not existing:
                player = models.Player(**p)
                db.add(player)
            else:
                for key, value in p.items():
                    setattr(existing, key, value)
    
    # Add some finished matches for the HomePage
    boston = db.query(models.Team).filter(models.Team.abbrev == "BOS").first()
    lakers = db.query(models.Team).filter(models.Team.abbrev == "LAL").first()
    warriors = db.query(models.Team).filter(models.Team.abbrev == "GSW").first()
    miami = db.query(models.Team).filter(models.Team.abbrev == "MIA").first()
    
    matches_data = [
        {"home_team_id": boston.id, "away_team_id": miami.id, "home_score": 118, "away_score": 104, "status": "finished"},
        {"home_team_id": lakers.id, "away_team_id": warriors.id, "home_score": 121, "away_score": 117, "status": "finished"},
        {"home_team_id": warriors.id, "away_team_id": boston.id, "home_score": 105, "away_score": 112, "status": "finished"},
    ]
    
    for m in matches_data:
        existing = db.query(models.Match).filter(
            models.Match.home_team_id == m["home_team_id"],
            models.Match.away_team_id == m["away_team_id"],
            models.Match.status == "finished"
        ).first()
        if not existing:
            match = models.Match(**m, created_by_id=admin_user.id)
            db.add(match)

    db.commit()
    db.close()
    print("✅ База данных успешно заполнена и синхронизирована")

if __name__ == "__main__":
    seed()
