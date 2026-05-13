from contextlib import asynccontextmanager

from app.flats.routers import router as flats_router
from app.ml.service import s3_service
from app.users.admin_routers import router as admin_router
from app.users.routers import router as users_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    await s3_service.load_model()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router)
app.include_router(admin_router)
app.include_router(flats_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
