from pydantic import BaseModel
from typing import Optional

class TeamBase(BaseModel):
    name: str
    city: str

class TeamCreate(TeamBase):
    pass

class Team(TeamBase):
    id: int
    wins: int
    losses: int
    class Config:
        from_attributes = True
