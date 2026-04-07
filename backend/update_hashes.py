from database import SessionLocal
from sqlalchemy import text
from scripts.auth import get_password_hash

db = SessionLocal()

admin_hash = get_password_hash('admin')
op_hash = get_password_hash('operator')
user_hash = get_password_hash('user')

db.execute(text("UPDATE users SET password_hash = :hash WHERE username = 'admin'"), {"hash": admin_hash})
db.execute(text("UPDATE users SET password_hash = :hash WHERE username = 'operator'"), {"hash": op_hash})
db.execute(text("UPDATE users SET password_hash = :hash WHERE username = 'user'"), {"hash": user_hash})

db.commit()
db.close()

print("Hashes updated successfully!")