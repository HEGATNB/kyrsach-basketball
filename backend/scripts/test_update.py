# scripts/test_update.py
import sys
import os
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from scripts.update_data import update_db_with_new_games
from datetime import datetime


def test_update():
    print("=" * 60)
    print("TESTING DATA UPDATE")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    try:
        new_games = update_db_with_new_games(days_back=1)
        print(f"\nUpdate completed")
        print(f"New games added: {new_games}")
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    test_update()