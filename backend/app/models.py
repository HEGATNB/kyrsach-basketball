from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from .database import Base

class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    city = Column(String)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    home_team_id = Column(Integer, ForeignKey("teams.id"))
    guest_team_id = Column(Integer, ForeignKey("teams.id"))
    home_score = Column(Integer, nullable=True)
    guest_score = Column(Integer, nullable=True)
    is_finished = Column(Boolean, default=False)
