from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings

class Base(DeclarativeBase):
    pass

def _create_engine_with_fallback():
    url = settings.database_url
    if "sqlite" in url:
        return create_engine(url, connect_args={"check_same_thread": False})
    try:
        engine_pg = create_engine(url, pool_pre_ping=True)
        with engine_pg.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine_pg
    except Exception as e:
        print(f"[Database] PostgreSQL connection failed ({e}). Falling back to local SQLite database.")
        sqlite_url = "sqlite:///./visioninspect.db"
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

engine = _create_engine_with_fallback()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

