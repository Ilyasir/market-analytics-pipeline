from datetime import datetime
from enum import Enum

from app.database import Base
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.orm import Mapped, mapped_column, relationship


class UserRole(Enum):
    GUEST = "GUEST"
    USER = "USER"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "app"}

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[UserRole] = mapped_column(
        PG_ENUM(UserRole, name="userrole", schema="app", create_type=False),
        default=UserRole.GUEST,
        server_default="GUEST",
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default="true")
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # связь с токенами
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": "app"}

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app.users.id", ondelete="CASCADE"), unique=True, index=True)
    token: Mapped[str] = mapped_column(nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")
