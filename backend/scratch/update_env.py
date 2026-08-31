import os
import urllib.parse

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.env"))

raw_password = "Pravinaa@98"
encoded_password = urllib.parse.quote_plus(raw_password)

env_content = f"""PROJECT_NAME="VisionInspect AI API"
API_V1_STR="/api/v1"
SECRET_KEY="super-secret-key-for-development"
POSTGRES_SERVER="localhost"
POSTGRES_PORT="5432"
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="{raw_password}"
POSTGRES_DB="visioninspect_db"
DATABASE_URL="postgresql://postgres:{encoded_password}@localhost:5432/visioninspect_db"
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173","http://127.0.0.1:3000","http://127.0.0.1:5173"]
"""

with open(env_path, "w") as f:
    f.write(env_content)

print(f"Updated {env_path} successfully. Encoded password: {encoded_password}")
