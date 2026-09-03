import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/visioninspect")

print(f"Connecting to database: {DATABASE_URL}")
engine = create_engine(DATABASE_URL)

alter_queries = [
    "ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS defect_detected BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS defect_count INTEGER DEFAULT 0;",
    "ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS defects_details JSON DEFAULT NULL;",
    "ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS severity_score FLOAT DEFAULT 0.0;",
    "ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS severity_level VARCHAR(50) DEFAULT 'Low';",
    "ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS decision VARCHAR(50) DEFAULT 'Pass';",
    "ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS preprocessed_filename VARCHAR(255) DEFAULT NULL;",
    "ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS annotated_filename VARCHAR(255) DEFAULT NULL;",
    "ALTER TABLE inspection_images ADD COLUMN IF NOT EXISTS preprocessing_details JSON DEFAULT NULL;"
]

try:
    with engine.connect() as conn:
        transaction = conn.begin()
        try:
            for query in alter_queries:
                print(f"Running: {query}")
                conn.execute(text(query))
            transaction.commit()
            print("Database patch applied successfully!")
        except Exception as err:
            transaction.rollback()
            print(f"Transaction failed, rolled back: {err}")
            raise err
except Exception as e:
    print(f"Failed to apply database patch: {e}")
