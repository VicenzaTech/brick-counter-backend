from fastapi import FastAPI, Depends
from db import SessionLocal
from measurement_service import MeasurementService
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime

app = FastAPI()

async def get_session():
    async with SessionLocal() as session:
        yield session

@app.get("/measurements/{device_id}")
async def get_measurements(
    device_id: int,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    limit: int = 100,
    offset: int = 0,
    session: AsyncSession = Depends(get_session),
):
    data = await MeasurementService.get_measurements_by_device(
        session=session,
        device_id=device_id,
        from_ts=from_ts,
        to_ts=to_ts,
        limit=limit,
        offset=offset,
    )

    return {
        "device_id": device_id,
        "count": len(data),
        "data": data,
    }

# uvicorn main:app --reload --port 8001
