from app.users.models import UserRole
from pydantic import BaseModel


class SUserAuth(BaseModel):
    username: str
    password: str


class SUserResponse(BaseModel):
    id: int
    username: str
    role: UserRole
    is_active: bool
    avatar_url: str | None = None

    class Config:
        from_attributes = True
