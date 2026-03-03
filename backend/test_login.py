from services.auth_service import AuthService, verify_password
from database import SessionLocal
import models

def test_login():
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.username == "admin").first()
    if user:
        print(f"User found: {user.username}")
        print(f"Hashed password in DB: {user.hashed_password}")
        is_valid = verify_password("admin", user.hashed_password)
        print(f"Password 'admin' valid: {is_valid}")
    else:
        print("User admin not found")
    db.close()

if __name__ == "__main__":
    test_login()
