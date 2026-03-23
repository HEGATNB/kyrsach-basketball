# test_env.py
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Определяем путь к .env
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / 'env'

print(f"📁 Текущая папка: {os.getcwd()}")
print(f"📁 Папка скрипта: {Path(__file__).resolve().parent}")
print(f"📁 Корень проекта (BASE_DIR): {BASE_DIR}")
print(f"📁 Путь к .env: {env_path}")
print(f"📁 .env существует: {env_path.exists()}")

if env_path.exists():
    print("\n📄 Содержимое .env:")
    with open(env_path, 'r', encoding='utf-8') as f:
        print(f.read())
else:
    print("\n❌ .env файл не найден!")

# Загружаем .env
load_dotenv(env_path)

print("\n🔧 Переменные после загрузки:")
print(f"  DB_NAME: {os.getenv('DB_NAME')}")
print(f"  DB_USER: {os.getenv('DB_USER')}")
print(f"  DB_PASSWORD: {'*' * len(os.getenv('DB_PASSWORD', '')) if os.getenv('DB_PASSWORD') else 'None'}")
print(f"  DB_HOST: {os.getenv('DB_HOST')}")
print(f"  DB_PORT: {os.getenv('DB_PORT')}")