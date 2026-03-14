from database import SessionLocal
import models

def check_users():
    db = SessionLocal()
    users = db.query(models.User).all()
    print(f"Total users in DB: {len(users)}")
    for u in users:
        print(f"ID: {u.id}, Username: {u.username}, Email: {u.email}, Role: {u.role}")
    db.close()

if __name__ == "__main__":
    check_users()
