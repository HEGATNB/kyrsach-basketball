from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    abbrev = Column(String(3), unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    nickname = Column(String)
    city = Column(String)
    arena = Column(String)
    founded_year = Column(Integer)
    conference_id = Column(Integer)
    division_id = Column(Integer)
    championships = Column(Integer, default=0)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    points_per_game = Column(Float, default=0.0)
    points_against = Column(Float, default=0.0)
    
    players = relationship("Player", back_populates="team")

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="scheduled")
    home_team_id = Column(Integer, ForeignKey("teams.id"))
    away_team_id = Column(Integer, ForeignKey("teams.id"))
    home_score = Column(Integer)
    away_score = Column(Integer)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
    creator = relationship("User", foreign_keys=[created_by_id])

class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    number = Column(Integer)
    position = Column(String)
    team_id = Column(Integer, ForeignKey("teams.id"))
    height = Column(String)
    weight = Column(Integer)
    birth_date = Column(String)
    points_per_game = Column(Float, default=0.0)
    rebounds_per_game = Column(Float, default=0.0)
    assists_per_game = Column(Float, default=0.0)
    image_url = Column(String)

    team = relationship("Team", back_populates="players")
