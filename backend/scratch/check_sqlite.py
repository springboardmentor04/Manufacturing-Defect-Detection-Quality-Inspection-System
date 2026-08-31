"""
Check contents of visioninspect.db SQLite file.
"""

import os
import sqlite3

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SQLITE_DB_PATH = os.path.join(PROJECT_ROOT, "backend", "visioninspect.db")

def check_sqlite():
    if not os.path.exists(SQLITE_DB_PATH):
        print("No visioninspect.db found")
        return

    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [r[0] for r in cursor.fetchall()]
    print(f"SQLite Tables ({len(tables)}): {tables}")

    for t in tables:
        try:
            cursor.execute(f'SELECT count(*) FROM "{t}"')
            cnt = cursor.fetchone()[0]
            print(f"  - Table '{t}': {cnt} rows")
        except Exception as e:
            print(f"  - Table '{t}': Error {e}")

    conn.close()

if __name__ == "__main__":
    check_sqlite()
