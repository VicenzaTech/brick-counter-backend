from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from models.measurement import Measurement

class MeasurementService:

    @staticmethod
    async def get_measurements_by_device(
        session: AsyncSession,
        device_id: int,
        from_ts: datetime | None = None,
        to_ts: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ):
        query = select(Measurement).where(Measurement.device_id == device_id)

        if from_ts:
            query = query.where(Measurement.timestamp >= from_ts)

        if to_ts:
            query = query.where(Measurement.timestamp <= to_ts)

        query = (
            query.order_by(Measurement.timestamp.desc())
                 .limit(limit)
                 .offset(offset)
        )

        result = await session.execute(query)
        return result.scalars().all()
