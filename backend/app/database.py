from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# Primary PostgreSQL Engine configuration using safe URL object
engine = create_engine(
    settings.get_database_url,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for obtaining database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables using SQLAlchemy metadata."""
    import app.models  # Ensures all models are registered
    Base.metadata.create_all(bind=engine)
