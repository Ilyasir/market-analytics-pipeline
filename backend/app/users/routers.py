from app.database import get_db
from app.ml.service import s3_service
from app.users.auth import AuthService
from app.users.dependencies import get_current_user
from app.users.models import User
from app.users.repository import UserRepository
from app.users.schemas import SUserAuth, SUserResponse
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["Auth"])


def set_tokens_cookies(response: Response, tokens: dict):
    response.set_cookie(
        key="flats_access_token",
        value=tokens["access_token"],
        httponly=True,
        secure=False,
        samesite="lax",
    )
    response.set_cookie(
        key="flats_refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=False,
        samesite="lax",
    )


@router.post("/register", response_model=SUserResponse)
async def register(data: SUserAuth, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    return await auth_service.register_user(username=data.username, password=data.password)


@router.post("/login")
async def login(response: Response, data: SUserAuth, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    tokens = await auth_service.authenticate_user(username=data.username, password=data.password)
    set_tokens_cookies(response, tokens)
    return {"message": "Успешный вход", "user": data.username}


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("flats_refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh токен отсутствует")

    auth_service = AuthService(db)
    new_tokens = await auth_service.refresh_tokens(refresh_token)
    set_tokens_cookies(response, new_tokens)
    return {"message": "Токены обновлены"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("flats_access_token")
    response.delete_cookie("flats_refresh_token")
    return {"message": "Вы вышли из системы"}


@router.get("/me", response_model=SUserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    # чекаем формат
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Разрешены только JPEG и PNG")

    file_content = await file.read()

    # ключ в S3
    file_extension = file.filename.split(".")[-1]
    s3_key = f"avatars/{current_user.id}.{file_extension}"
    bucket_name = "user-data"

    # Загружаем в S3
    try:
        avatar_url = s3_service.upload_file(
            file_content=file_content, bucket=bucket_name, s3_key=s3_key, content_type=file.content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка с S3: {str(e)}")  # noqa: B904

    user_repo = UserRepository(db)
    await user_repo.update({"id": current_user.id}, avatar_url=avatar_url)

    return {"status": "success", "avatar_url": avatar_url}
