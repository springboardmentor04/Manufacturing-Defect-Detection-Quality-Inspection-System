from __future__ import annotations

from argparse import ArgumentParser
from secrets import token_urlsafe
from typing import Optional

from sqlalchemy import select

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import inspection_image, product, role, user  # noqa: F401
from app.models.enums import RoleName
from app.models.role import Role
from app.models.user import User


DEFAULT_ADMIN_EMAIL = "admin@visioninspect.ai"
DEFAULT_ADMIN_FULL_NAME = "VisionInspect Admin"


def ensure_roles() -> None:
    with SessionLocal() as session:
        existing_roles = {role.name for role in session.scalars(select(Role)).all()}
        created = False
        for role_name in RoleName:
            if role_name not in existing_roles:
                session.add(Role(name=role_name))
                created = True
        if created:
            session.commit()


def seed_admin_user(email: str, full_name: str, password: Optional[str] = None) -> Optional[str]:
    generated_password = password or token_urlsafe(12)
    with SessionLocal() as session:
        ensure_roles()
        admin_role = session.scalar(select(Role).where(Role.name == RoleName.admin))
        assert admin_role is not None

        existing_user = session.scalar(select(User).where(User.email == email))
        if existing_user is not None:
            print(f"Admin user already exists: {existing_user.email}")
            return None

        admin_user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(generated_password),
            role_id=admin_role.id,
            is_active=True,
        )
        session.add(admin_user)
        session.commit()
        print("Seeded initial admin user:")
        print(f"  email: {email}")
        print(f"  password: {generated_password}")
        return generated_password


def main() -> None:
    parser = ArgumentParser(description="Seed VisionInspect AI roles and an initial admin user")
    parser.add_argument("--admin-email", default=DEFAULT_ADMIN_EMAIL)
    parser.add_argument("--admin-full-name", default=DEFAULT_ADMIN_FULL_NAME)
    parser.add_argument("--admin-password", default=None)
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    ensure_roles()
    seed_admin_user(args.admin_email, args.admin_full_name, args.admin_password)


if __name__ == "__main__":
    main()
