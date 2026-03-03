import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

import models
from schemas import UserCreate
from scripts.auth import get_password_hash, verify_password, generate_token, TokenPayload

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str):
        return self.db.query(models.User).filter(models.User.email == email).first()

    def get_user_by_username(self, username: str):
        return self.db.query(models.User).filter(models.User.username == username).first()

    def get_user_by_id(self, user_id: int):
        return self.db.query(models.User).filter(models.User.id == user_id).first()

    def authenticate_user(self, username: str, password: str):
        user = self.get_user_by_username(username)
        if not user:
            return False
        if not verify_password(password, user.hashed_password):
            return False
        return user

    def create_access_token(self, user: models.User):
        payload = TokenPayload(
            user_id=user.id,
            email=user.email,
            role=user.role
        )
        return generate_token(payload)

    def create_user(self, user_data: UserCreate):
        if self.get_user_by_email(user_data.email):
            raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
        
        if self.get_user_by_username(user_data.username):
            raise HTTPException(status_code=400, detail="Пользователь с таким именем уже существует")

        hashed_password = get_password_hash(user_data.password)

        db_user = models.User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            role=user_data.role or "user",
            is_active=True
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        return db_user
