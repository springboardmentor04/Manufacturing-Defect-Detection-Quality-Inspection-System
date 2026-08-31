import os
import sys
import sqlite3
import uuid
from datetime import datetime
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import URL

# Add parent directory to path for app imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.database import Base, engine, SessionLocal
import app.models  # Ensures all 19 ORM models are registered


SQLITE_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "visioninspect.db"))


def ensure_postgres_database_exists():
    """Ensure the target PostgreSQL database exists; create it if missing."""
    db_name = settings.POSTGRES_DB or "visioninspect_db"
    
    postgres_default_url = URL.create(
        drivername="postgresql+psycopg2",
        username=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_SERVER,
        port=int(settings.POSTGRES_PORT) if settings.POSTGRES_PORT else 5432,
        database="postgres"
    )

    try:
        # Connect to default postgres DB to check/create target database
        temp_engine = create_engine(postgres_default_url, isolation_level="AUTOCOMMIT")
        with temp_engine.connect() as conn:
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"))
            exists = result.scalar()
            if not exists:
                print(f"[POSTGRES] Creating target database '{db_name}'...")
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                print(f"[POSTGRES] Database '{db_name}' created successfully.")
            else:
                print(f"[POSTGRES] Database '{db_name}' exists.")
        temp_engine.dispose()
    except Exception as e:
        print(f"[POSTGRES] Notice during DB creation check: {e}")


def init_postgres_schema():
    """Create all 19 application tables in PostgreSQL."""
    print("[POSTGRES] Creating tables in PostgreSQL using SQLAlchemy metadata...")
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"[POSTGRES] Successfully verified {len(tables)} tables in PostgreSQL:")
    for t in sorted(tables):
        print(f"  - {t}")
    return tables


def migrate_sqlite_data_to_postgres():
    """Migrate data from SQLite visioninspect.db to PostgreSQL."""
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"[MIGRATION] SQLite database file not found at {SQLITE_DB_PATH}. Skipping row migration.")
        return 0

    print(f"[MIGRATION] Reading source records from SQLite: {SQLITE_DB_PATH}")
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    # Get list of tables in SQLite
    sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    sqlite_tables = [row[0] for row in sqlite_cursor.fetchall()]

    pg_session = SessionLocal()
    total_migrated_records = 0

    try:
        # Order tables to respect foreign keys
        migration_order = [
            "roles",
            "users",
            "refresh_tokens",
            "products",
            "datasets",
            "dataset_images",
            "dataset_preprocessing_jobs",
            "ai_models",
            "production_lines",
            "camera_sensors",
            "inspections",
            "ai_predictions",
            "defect_details",
            "inspection_reports",
            "line_utilizations",
            "alerts",
            "activity_logs",
            "system_metrics",
            "notifications"
        ]

        # Process tables in order, then any remaining tables
        ordered_tables = [t for t in migration_order if t in sqlite_tables]
        remaining_tables = [t for t in sqlite_tables if t not in ordered_tables]
        all_tables_to_migrate = ordered_tables + remaining_tables

        for table_name in all_tables_to_migrate:
            sqlite_cursor.execute(f'SELECT * FROM "{table_name}"')
            rows = sqlite_cursor.fetchall()
            if not rows:
                continue

            columns = [column[0] for column in sqlite_cursor.description]
            count_table_records = 0

            for row in rows:
                row_dict = dict(row)
                
                # Format parameters for SQL insert
                cols_str = ", ".join([f'"{col}"' for col in columns])
                placeholders = ", ".join([f":{col}" for col in columns])
                sql = text(f'INSERT INTO "{table_name}" ({cols_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING')
                
                pg_session.execute(sql, row_dict)
                count_table_records += 1

            pg_session.commit()
            total_migrated_records += count_table_records
            print(f"  [MIGRATED] Table '{table_name}': {count_table_records} records")

    except Exception as e:
        pg_session.rollback()
        print(f"[MIGRATION ERROR] Failed during migration: {e}")
        raise e
    finally:
        sqlite_conn.close()
        pg_session.close()

    return total_migrated_records


if __name__ == "__main__":
    print("\n--- STARTING SQLITE TO POSTGRESQL MIGRATION ---\n")
    ensure_postgres_database_exists()
    tables = init_postgres_schema()
    migrated_count = migrate_sqlite_data_to_postgres()
    
    print("\n--- MIGRATION COMPLETED SUCCESSFULLY ---")
    print(f"Target Database: {settings.POSTGRES_DB}")
    print(f"Total Tables Created: {len(tables)}")
    print(f"Total Records Migrated: {migrated_count}\n")
