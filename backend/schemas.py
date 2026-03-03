from pydantic import BaseModel, EmailStr, Field, AliasChoices
from datetime import datetime
from typing import Optional, List

# Helper to allow both snake_case and camelCase
def to_camel(string: str) -> str:
    return "".join(word.capitalize() or "_" for word in string.split("_"))

class AppModel(BaseModel):
    class Config:
        from_attributes = True
        populate_by_name = True
        # alias_generator = to_camel # could be used but let's be explicit for relationships

# User schemas
class UserBase(AppModel):
    email: EmailStr
    username: str
    role: Optional[str] = "user"

class UserCreate(UserBase):
    password: str = Field(..., max_length=72)

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Player schemas
class PlayerBase(AppModel):
    first_name: str
    last_name: str
    number: Optional[int] = None
    position: Optional[str] = None
    team_id: int
    height: Optional[str] = None
    weight: Optional[int] = None
    birth_date: Optional[str] = None
    points_per_game: float = 0.0
    rebounds_per_game: float = 0.0
    assists_per_game: float = 0.0
    image_url: Optional[str] = None

class PlayerCreate(PlayerBase):
    pass

class PlayerResponse(PlayerBase):
    id: int

# Team schemas
class TeamBase(AppModel):
    name: str
    abbrev: str = Field(..., min_length=2, max_length=3)
    full_name: str
    nickname: Optional[str] = None
    city: Optional[str] = None
    arena: Optional[str] = None
    founded_year: Optional[int] = None

class TeamCreate(TeamBase):
    conference_id: int
    division_id: int

class TeamUpdate(AppModel):
    name: Optional[str] = None
    nickname: Optional[str] = None
    arena: Optional[str] = None
    championships: Optional[int] = None

class TeamResponse(TeamBase):
    id: int
    conference_id: Optional[int] = None
    division_id: Optional[int] = None
    championships: int
    wins: int
    losses: int
    points_per_game: float
    points_against: float

# Match schemas
class MatchBase(AppModel):
    date: datetime
    status: str = "scheduled"
    home_team_id: int
    away_team_id: int

class MatchCreate(MatchBase):
    pass

class MatchResultUpdate(BaseModel):
    home_score: int
    away_score: int

class MatchResponse(MatchBase):
    id: int
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    created_by_id: int
    created_at: datetime
    
    # Relationships for frontend (using aliases for camelCase)
    homeTeam: Optional[TeamResponse] = Field(None, validation_alias=AliasChoices('home_team', 'homeTeam'))
    awayTeam: Optional[TeamResponse] = Field(None, validation_alias=AliasChoices('away_team', 'awayTeam'))

# Prediction schemas
class PredictionRequest(BaseModel):
    team1_id: int
    team2_id: int

class PredictionResponse(AppModel):
    id: int
    team1_id: int
    team2_id: int
    probability_team1: float = Field(..., validation_alias=AliasChoices('probability_team1', 'probabilityTeam1'))
    probability_team2: float = Field(..., validation_alias=AliasChoices('probability_team2', 'probabilityTeam2'))
    predicted_winner_id: int
    home_score_predicted: Optional[int] = Field(None, validation_alias=AliasChoices('home_score_predicted', 'expectedScoreTeam1'))
    away_score_predicted: Optional[int] = Field(None, validation_alias=AliasChoices('away_score_predicted', 'expectedScoreTeam2'))
    confidence: float
    model_version: Optional[str] = Field(None, validation_alias=AliasChoices('model_version', 'modelVersion'))
    created_at: datetime
    
    team1: Optional[TeamResponse] = None
    team2: Optional[TeamResponse] = None

class ModelEvaluationResponse(BaseModel):
    accuracy: Optional[float]
    message: str

class ModelStatsResponse(BaseModel):
    total_predictions: int
    total_training_data: int
    accuracy: Optional[float]
    model_version: str

# Audit schemas
class AuditLogResponse(AppModel):
    id: int
    user_id: int
    action: str
    entity: Optional[str]
    details: Optional[str]
    created_at: datetime
