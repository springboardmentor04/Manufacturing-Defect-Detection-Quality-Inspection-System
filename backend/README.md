# VisionInspect AI Backend

Milestone 1 backend for VisionInspect AI. This is a FastAPI service with PostgreSQL, JWT auth, RBAC, local filesystem image storage, a MVTec AD loader, and seed utilities.

## Project Layout

- `app/core` - config, auth helpers, and dependencies
- `app/db` - SQLAlchemy base and session management
- `app/models` - database models and enums
- `app/schemas` - Pydantic v2 request/response models
- `app/api` - API routers
- `app/services` - seed script, dataset loader, and image ingestion helpers
- `app/storage` - storage abstraction with a local filesystem backend

## Run With Docker

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Start the stack:

   ```bash
   docker compose up --build
   ```

3. Open the API docs:

   - `http://localhost:8000/docs`

The API container creates the tables on startup with `Base.metadata.create_all()`. Replace this with Alembic migrations before production.

## Seed Roles And Admin

After the stack is up, create the three roles and one initial admin user:

```bash
docker compose exec api python -m app.services.seed
```

The script prints the generated admin credentials once. Do not store that password in source control.

## Example Flow

Register a user:

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "engineer@visioninspect.local",
    "password": "ChangeMe123!",
    "full_name": "Quality Engineer",
    "role": "quality_engineer"
  }'
```

Log in:

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=engineer@visioninspect.local&password=ChangeMe123!"
```

Upload an image:

```bash
curl -X POST http://localhost:8000/images/upload \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@./sample.png"
```

Get the dashboard summary:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:8000/dashboard/summary
```

## MVTec AD Loader

The loader expects a manually downloaded MVTec AD folder laid out like:

```text
<dataset-root>/<category>/<split>/<defect_type_or_good>/*.png
```

Run it from inside the API container or locally with the same environment variables:

```bash
python -m app.services.dataset_loader --dataset-root /path/to/mvtec_ad --split train
python -m app.services.dataset_loader --dataset-root /path/to/mvtec_ad --split test
```

The loader does not download the dataset automatically because MVTec requires manual license acceptance.

## Notes

- JWT secrets come from environment variables.
- Passwords are bcrypt-hashed with `passlib`.
- CORS is permissive for now and should be tightened before production.
- Local storage is abstracted so an S3 backend can replace it later.
