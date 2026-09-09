from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import RoleName


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[RoleName] = mapped_column(SAEnum(RoleName, name="role_name"), unique=True, nullable=False)

    users = relationship("User", back_populates="role")
