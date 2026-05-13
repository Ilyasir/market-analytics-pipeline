import os

import httpx
from app.database import get_db
from app.flats.models import OkrugName
from app.flats.repository import FlatRepository
from app.flats.schemas import SFlatList, SFlatResponse
from app.ml.service import s3_service
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/flats", tags=["Flats"])


@router.get("/{flat_id}", response_model=SFlatResponse)
async def get_flat(flat_id: int, db: AsyncSession = Depends(get_db)):
    flat_repo = FlatRepository(db)
    flat = await flat_repo.find_one_or_none(id=flat_id)

    if not flat:
        raise HTTPException(status_code=404, detail="Квартира не найдена")

    return flat


@router.get("", response_model=SFlatList)
async def get_flats(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    min_price: int | None = None,
    max_price: int | None = None,
    okrug: OkrugName | None = None,
    rooms: int | None = Query(None, ge=0, le=6),
):
    repo = FlatRepository(db)

    filter_params = {"min_price": min_price, "max_price": max_price, "okrug": okrug, "rooms_count": rooms}

    items = await repo.find_filtered(limit=limit, offset=offset, **filter_params)
    total = await repo.get_count(**filter_params)

    return {"total": total, "limit": limit, "offset": offset, "items": items, "pages": (total + limit - 1) // limit}


class SFlatPredictRequest(BaseModel):
    area: float
    rooms_count: int
    floor: int
    total_floors: int
    metro_min: int
    is_apartament: bool
    is_studio: bool
    is_new_moscow: bool
    okrug: str
    district: str


@router.post("/predict")
async def predict_price(data: SFlatPredictRequest):
    is_first_floor = data.floor == 1
    is_last_floor = data.floor == data.total_floors
    is_high_rise = data.total_floors > 18
    rel_floor = data.floor / data.total_floors
    area_per_room = data.area / (data.rooms_count + 1)

    features = [
        str(data.is_apartament),
        str(data.is_studio),
        float(data.area),
        int(data.rooms_count),
        int(data.floor),
        int(data.total_floors),
        str(is_first_floor),
        str(is_last_floor),
        str(data.is_new_moscow),
        str(data.okrug),
        str(data.district),
        int(data.metro_min),
        float(rel_floor),
        float(area_per_room),
        str(is_high_rise),
    ]

    price_per_meter = s3_service.predict([features])[0]
    total_price = price_per_meter * data.area

    return {"price_per_meter": round(price_per_meter, 2), "total_price": round(total_price, 2)}


@router.get("/{flat_id}/coords")
async def get_flat_coords(flat_id: int, db: AsyncSession = Depends(get_db)):
    repo = FlatRepository(db)
    flat = await repo.find_one_or_none(id=flat_id)

    if not flat:
        raise HTTPException(status_code=404, detail="Квартира не найдена")

    full_address = flat.address
    api_key = os.getenv("YANDEX_MAPS_API_KEY")

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://geocode-maps.yandex.ru/1.x/",
                params={"apikey": api_key, "geocode": full_address, "format": "json"},
                timeout=5.0,
            )
            response.raise_for_status()
            data = response.json()

            pos = data["response"]["GeoObjectCollection"]["featureMember"][0]["GeoObject"]["Point"]["pos"]
            lon, lat = map(float, pos.split())

            return {"lat": lat, "lon": lon, "address": full_address}

        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Ошибка внешнего API: {str(e)}")  # noqa: B904
