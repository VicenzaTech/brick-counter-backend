#!/usr/bin/env python3
"""
Simple CLI to fetch measurements from Postgres using the existing async SQLAlchemy setup.
Usage:
  python get_measurements.py --device 123 --from 2025-11-21T00:00:00 --to 2025-11-22T00:00:00 --limit 100

This script uses `db.SessionLocal` (async_sessionmaker) and the `Measurement` model defined
in `model.py`.
"""
import argparse
import asyncio
import json
from datetime import datetime
from typing import Optional

from db import SessionLocal
from model import Measurement
from sqlalchemy import select


def parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        # Accept ISO 8601-like strings
        return datetime.fromisoformat(s)
    except Exception:
        raise argparse.ArgumentTypeError(f"Invalid datetime: {s}. Use ISO format like 2025-11-21T00:00:00")


def serialize_measurement(m: Measurement) -> dict:
    return {
        "id": int(m.id) if m.id is not None else None,
        "timestamp": m.timestamp.isoformat() if m.timestamp else None,
        "device_id": m.device_id,
        "cluster_id": m.cluster_id,
        "type_id": m.type_id,
        "ingest_time": m.ingest_time.isoformat() if m.ingest_time else None,
        "data": m.data,
    }


async def fetch(device_id: int, from_ts: Optional[datetime], to_ts: Optional[datetime], limit: int, offset: int):
    async with SessionLocal() as session:
        stmt = select(Measurement).where(Measurement.device_id == device_id)
        if from_ts:
            stmt = stmt.where(Measurement.timestamp >= from_ts)
        if to_ts:
            stmt = stmt.where(Measurement.timestamp <= to_ts)
        stmt = stmt.order_by(Measurement.timestamp.desc()).limit(limit).offset(offset)

        result = await session.execute(stmt)
        rows = result.scalars().all()
        return [serialize_measurement(r) for r in rows]


def main():
    parser = argparse.ArgumentParser(description="Fetch measurements for a device")
    parser.add_argument("--device", "-d", required=True, type=int, help="device_id (integer)")
    parser.add_argument("--from", dest="from_ts", type=parse_iso, help="Start timestamp (ISO)")
    parser.add_argument("--to", dest="to_ts", type=parse_iso, help="End timestamp (ISO)")
    parser.add_argument("--limit", type=int, default=100, help="Limit number of rows")
    parser.add_argument("--offset", type=int, default=0, help="Offset")

    args = parser.parse_args()

    data = asyncio.run(fetch(args.device, args.from_ts, args.to_ts, args.limit, args.offset))
    print(json.dumps({"device_id": args.device, "count": len(data), "data": data}, indent=2, default=str))


if __name__ == "__main__":
    main()

    # python get_measurements.py --device 123 --from 2025-11-21T00:00:00 --to 2025-11-22T00:00:00 --limit 100
