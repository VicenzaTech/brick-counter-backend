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
import sys
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Tuple
from collections import defaultdict
from dataclasses import dataclass, asdict

from db import SessionLocal
from model import Measurement
from sqlalchemy import select, and_, cast, String


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


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class ProductionStageData:
    """Dữ liệu sản lượng tại một công đoạn."""
    stage_name: str
    device_codes: List[str]
    total_count: int
    measurements_count: int
    reset_detected: int


@dataclass
class WasteAnalysis:
    """Phân tích hao phí."""
    hp_moc: int  # Hao phí mộc
    hp_lo: int   # Hao phí lò
    hp_tm: int   # Hao phí trước mài
    hp_ht: int   # Hao phí hoàn thiện
    
    ty_le_hp_moc: float
    ty_le_hp_lo: float
    ty_le_hp_tm: float
    ty_le_hp_ht: float
    
    tong_hao_phi: int
    ty_le_tong_hp: float
    
    canh_bao_hp_moc: bool
    canh_bao_hp_lo: bool
    canh_bao_hp_tm: bool
    canh_bao_hp_ht: bool


@dataclass
class EfficiencyMetrics:
    """Chỉ số hiệu suất."""
    hieu_suat_moc: float      # Hiệu suất công đoạn mộc
    hieu_suat_lo: float       # Hiệu suất lò nung
    hieu_suat_truoc_mai: float
    hieu_suat_thanh_pham: float


@dataclass
class QuotaComparison:
    """So sánh với mức khoán."""
    product_line: str
    san_luong_thuc_te: int    # m² (cần quy đổi)
    san_luong_khoan: int      # m²
    chenh_lech: int
    ty_le_vuot_khoan: float
    working_days: float


@dataclass
class DailyProductionReport:
    """Báo cáo sản xuất hàng ngày."""
    production_date: str
    cluster_id: int
    product_line: str
    
    # Sản lượng các công đoạn
    sl_ep: int
    sl_truoc_lo: int
    sl_sau_lo: int
    sl_truoc_mai: int
    sl_sau_mai_canh: int
    sl_truoc_dong_hop: int
    
    # Phân tích hao phí
    waste: WasteAnalysis
    
    # Hiệu suất
    efficiency: EfficiencyMetrics
    
    # So sánh khoán
    quota: Optional[QuotaComparison]


# =============================================================================
# PRODUCTION STAGE DEFINITIONS
# =============================================================================

DEVICE_POSITIONS = {
    'ep': ['SAU-ME-01', 'SAU-ME-02'],
    'truoc_lo': ['TRUOC-LN-01', 'TRUOC-LN-02'],
    'sau_lo': ['SAU-LN-01'],
    'truoc_mai': ['TRUOC-MM-01'],
    'sau_mai_canh': ['SAU-MC-01'],
    'truoc_dong_hop': ['TRUOC-DH-01']
}

# Optional device mapping file: maps position names to numeric DB `device_id` values.
# Example 'device_mapping.json':
# {
#   "ep": [1, 2],
#   "truoc_lo": [3, 4],
#   "sau_lo": [5],
#   "truoc_mai": [6],
#   "sau_mai_canh": [7],
#   "truoc_dong_hop": [8]
# }
from pathlib import Path
_mapping_file = Path(__file__).with_name('device_mapping.json')
DEVICE_POSITION_IDS = None
if _mapping_file.exists():
    try:
        with _mapping_file.open('r', encoding='utf-8') as _f:
            DEVICE_POSITION_IDS = json.load(_f)
    except Exception:
        DEVICE_POSITION_IDS = None

DEVICE_CODE_TO_ID = {
    'SAU-ME-01': 1,
    'SAU-ME-02': 2,
    'TRUOC-LN-01': 3,
    'TRUOC-LN-02': 4,
    'SAU-LN-01': 5,
    'TRUOC-MM-01': 6,
    'SAU-MC-01': 7,
    'TRUOC-DH-01': 8
}

# Ngưỡng cảnh báo hao phí (%)
WASTE_THRESHOLDS = {
    'hp_moc': 2.0,
    'hp_lo': 3.0,
    'hp_tm': 2.0,
    'hp_ht': 2.0
}

# Mức khoán theo dòng sản phẩm (từ Phụ lục 1)
# Format: {product_line: {cycle_minutes, monthly_quota_30days, monthly_quota_31days}}
QUOTA_DATA = {
    '300x600mm': {'cycle': 50, 'quota_30': 273300, 'quota_31': 282900},
    '400x800mm': {'cycle': 48, 'quota_30': 320900, 'quota_31': 332200},
    '600x600mm': {'cycle': 44, 'quota_30': 355700, 'quota_31': 368200},
    '800x800mm': {'cycle': 44, 'quota_30': 359100, 'quota_31': 371700},
    '500x500mm': {'cycle': 43, 'quota_30': 461100, 'quota_31': 477300},
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def parse_iso(s: Optional[str]) -> Optional[datetime]:
    """Parse ISO datetime string."""
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except Exception:
        raise argparse.ArgumentTypeError(
            f"Invalid datetime: {s}. Use ISO format like 2025-11-21T00:00:00"
        )


def parse_date(s: Optional[str]) -> Optional[date]:
    """Parse date string."""
    if not s:
        return None
    try:
        return datetime.strptime(s, '%Y-%m-%d').date()
    except Exception:
        raise argparse.ArgumentTypeError(
            f"Invalid date: {s}. Use format YYYY-MM-DD"
        )


def serialize_measurement(m: Measurement) -> dict:
    """Serialize Measurement object to dict."""
    return {
        "id": int(m.id) if m.id is not None else None,
        "timestamp": m.timestamp.isoformat() if m.timestamp else None,
        "device_id": m.device_id,
        "cluster_id": m.cluster_id,
        "type_id": m.type_id,
        "ingest_time": m.ingest_time.isoformat() if m.ingest_time else None,
        "data": m.data,
    }


def serialize_timestamp_count(m: dict) -> dict:
    """Return only timestamp and count fields from a serialized measurement dict.

    Accepts the dict returned by `serialize_measurement(...)` and returns
    {'timestamp': <iso ts>, 'count': <int|null>} where count is taken from
    `data.metrics.count` if present.
    """
    ts = m.get('timestamp')
    count = None
    try:
        count = m.get('data', {}).get('metrics', {}).get('count')
    except Exception:
        count = None
    return {"timestamp": ts, "count": count}


# =============================================================================
# COUNTER PROCESSING
# =============================================================================

class CounterProcessor:
    """Xử lý counter với logic reset detection."""
    
    def __init__(self, reset_threshold_ratio: float = 0.5):
        self.reset_threshold_ratio = reset_threshold_ratio
    
    def calculate_production_count(
        self,
        measurements: List[Dict],
        device_code: str
    ) -> Tuple[int, int]:
        """
        Tính tổng sản phẩm từ counter với xử lý reset.
        
        Returns:
            (total_count, reset_count)
        """
        if not measurements:
            return 0, 0
        
        # Sort by timestamp
        sorted_measurements = sorted(measurements, key=lambda x: x['timestamp'])
        
        total_count = 0
        previous_count = None
        reset_count = 0
        
        for m in sorted_measurements:
            try:
                current_count = m['data']['metrics']['count']
            except (KeyError, TypeError):
                continue
            
            if previous_count is None:
                previous_count = current_count
                continue
            
            delta = current_count - previous_count
            
            # Detect reset
            if delta < 0 or current_count < previous_count * self.reset_threshold_ratio:
                delta = current_count
                reset_count += 1
                print(f"  [RESET] {device_code} at {m['timestamp']}: "
                      f"prev={previous_count}, curr={current_count}")
            elif delta < 0:
                delta = 0
            
            total_count += delta
            previous_count = current_count
        
        return total_count, reset_count
    
    def aggregate_multiple_counters(
        self,
        measurements_by_device: Dict[str, List[Dict]]
    ) -> Tuple[int, int, int]:
        """
        Tổng hợp từ nhiều counter.
        
        Returns:
            (total_count, total_measurements, total_resets)
        """
        total = 0
        total_measurements = 0
        total_resets = 0
        
        for device_code, measurements in measurements_by_device.items():
            count, resets = self.calculate_production_count(measurements, device_code)
            total += count
            total_measurements += len(measurements)
            total_resets += resets
            print(f"  {device_code}: {count} units ({len(measurements)} measurements, {resets} resets)")
        
        return total, total_measurements, total_resets


# =============================================================================
# DATABASE QUERIES
# =============================================================================

async def fetch_measurements_by_device(
    device_id: int,
    from_ts: Optional[datetime],
    to_ts: Optional[datetime],
    limit: int = 1000,
    offset: int = 0
) -> List[Dict]:
    """Fetch measurements for a single device."""
    async with SessionLocal() as session:
        stmt = select(Measurement).where(Measurement.device_id == device_id)
        if from_ts:
            stmt = stmt.where(Measurement.timestamp >= from_ts)
        if to_ts:
            stmt = stmt.where(Measurement.timestamp <= to_ts)
        stmt = stmt.order_by(Measurement.timestamp).limit(limit).offset(offset)
        
        result = await session.execute(stmt)
        rows = result.scalars().all()
        return [serialize_measurement(r) for r in rows]


async def fetch_measurements_by_device_codes(
    device_codes: List[str],
    from_ts: datetime,
    to_ts: datetime,
    cluster_id: Optional[int] = None
) -> Dict[str, List[Dict]]:
    """
    Fetch measurements for multiple device codes (deviceId in JSONB).
    
    Returns:
        Dict mapping device_code to list of measurements
    """
    async with SessionLocal() as session:
        results = {}
        
        for device_code in device_codes:
            # Query using JSONB operator (use cast to text for compatibility)
            stmt = select(Measurement).where(
                and_(
                    Measurement.timestamp >= from_ts,
                    Measurement.timestamp <= to_ts,
                    cast(Measurement.data['deviceId'], String) == device_code
                )
            )
            
            if cluster_id:
                stmt = stmt.where(Measurement.cluster_id == cluster_id)
            
            stmt = stmt.order_by(Measurement.timestamp)
            
            result = await session.execute(stmt)
            rows = result.scalars().all()
            results[device_code] = [serialize_measurement(r) for r in rows]
        
        return results


async def fetch_measurements_by_device_ids(
    device_ids: List[int],
    from_ts: datetime,
    to_ts: datetime,
    cluster_id: Optional[int] = None
) -> Dict[str, List[Dict]]:
    """
    Fetch measurements for multiple numeric device_ids and return a mapping
    of device_id (as string) -> list of serialized measurements.
    """
    async with SessionLocal() as session:
        results = {str(d): [] for d in device_ids}
        if not device_ids:
            return results

        stmt = select(Measurement).where(
            and_(
                Measurement.timestamp >= from_ts,
                Measurement.timestamp <= to_ts,
                Measurement.device_id.in_(device_ids)
            )
        )
        if cluster_id:
            stmt = stmt.where(Measurement.cluster_id == cluster_id)

        stmt = stmt.order_by(Measurement.timestamp)
        result = await session.execute(stmt)
        rows = result.scalars().all()

        for r in rows:
            key = str(r.device_id)
            results.setdefault(key, []).append(serialize_measurement(r))

        return results


async def fetch_all_position_measurements(
    cluster_id: int,
    from_ts: datetime,
    to_ts: datetime
) -> Dict[str, Dict[str, List[Dict]]]:
    """
    Fetch measurements for all positions.
    
    Returns:
        Dict mapping position_name to {device_code: measurements}
    """
    # If a numeric device mapping file exists, query by numeric device_id.
    if DEVICE_POSITION_IDS:
        all_ids = []
        for ids in DEVICE_POSITION_IDS.values():
            all_ids.extend(ids)

        measurements_by_device = await fetch_measurements_by_device_ids(
            all_ids, from_ts, to_ts, cluster_id
        )

        # Group by position using numeric ids (keys as strings)
        by_position = {}
        for position, ids in DEVICE_POSITION_IDS.items():
            by_position[position] = {
                str(id_): measurements_by_device.get(str(id_), [])
                for id_ in ids
            }

        return by_position

    # Fallback: use DEVICE_POSITIONS (device codes inside JSON payload)
    all_device_codes = []
    for codes in DEVICE_POSITIONS.values():
        all_device_codes.extend(codes)

    measurements_by_device = await fetch_measurements_by_device_codes(
        all_device_codes, from_ts, to_ts, cluster_id
    )

    # Group by position
    by_position = {}
    for position, codes in DEVICE_POSITIONS.items():
        by_position[position] = {
            code: measurements_by_device.get(code, [])
            for code in codes
        }

    return by_position


async def fetch_timeline_by_device_for_day(
    cluster_id: int,
    production_date: date,
    limit_per_device: Optional[int] = None
) -> Dict[int, List[Dict]]:
    """
    Fetch the timeline (ordered by timestamp) of measurements for each device
    in a given cluster on a specific day.

    Returns a dict mapping numeric device_id -> list of serialized measurements
    ordered by timestamp ascending.

    Args:
        cluster_id: numeric cluster id to filter measurements
        production_date: date object for the day to fetch
        limit_per_device: optional limit of rows per device (None = no limit)
    """
    from_ts = datetime.combine(production_date, datetime.min.time())
    next_day = from_ts + timedelta(days=1)

    async with SessionLocal() as session:
        stmt = select(Measurement).where(
            and_(
                Measurement.cluster_id == cluster_id,
                Measurement.timestamp >= from_ts,
                Measurement.timestamp < next_day,
            )
        ).order_by(Measurement.device_id, Measurement.timestamp)

        result = await session.execute(stmt)
        rows = result.scalars().all()

        timeline: Dict[int, List[Dict]] = {}
        for r in rows:
            key = int(r.device_id) if r.device_id is not None else -1
            timeline.setdefault(key, []).append(serialize_measurement(r))

        # If a per-device limit is requested, trim lists
        if limit_per_device is not None and limit_per_device > 0:
            for k in list(timeline.keys()):
                timeline[k] = timeline[k][-limit_per_device:]

        return timeline


# =============================================================================
# ANALYSIS FUNCTIONS
# =============================================================================

def calculate_stage_production(
    measurements_by_device: Dict[str, List[Dict]],
    stage_name: str
) -> ProductionStageData:
    """Tính sản lượng tại một công đoạn."""
    processor = CounterProcessor()
    
    device_codes = list(measurements_by_device.keys())
    total_count, measurements_count, reset_count = processor.aggregate_multiple_counters(
        measurements_by_device
    )
    
    return ProductionStageData(
        stage_name=stage_name,
        device_codes=device_codes,
        total_count=total_count,
        measurements_count=measurements_count,
        reset_detected=reset_count
    )


def calculate_waste_analysis(
    sl_ep: int,
    sl_truoc_lo: int,
    sl_sau_lo: int,
    sl_truoc_mai: int,
    sl_truoc_dong_hop: int
) -> WasteAnalysis:
    """Tính toán phân tích hao phí."""
    
    # Hao phí tuyệt đối
    hp_moc = max(0, sl_ep - sl_truoc_lo)
    hp_lo = max(0, sl_truoc_lo - sl_sau_lo)
    hp_tm = max(0, sl_sau_lo - sl_truoc_mai)
    hp_ht = max(0, sl_truoc_mai - sl_truoc_dong_hop)
    tong_hao_phi = hp_moc + hp_lo + hp_tm + hp_ht
    
    # Tỷ lệ hao phí (%)
    ty_le_hp_moc = (hp_moc / sl_ep * 100) if sl_ep > 0 else 0
    ty_le_hp_lo = (hp_lo / sl_ep * 100) if sl_ep > 0 else 0
    ty_le_hp_tm = (hp_tm / sl_ep * 100) if sl_ep > 0 else 0
    ty_le_hp_ht = (hp_ht / sl_ep * 100) if sl_ep > 0 else 0
    ty_le_tong_hp = (tong_hao_phi / sl_ep * 100) if sl_ep > 0 else 0
    
    # Cảnh báo
    canh_bao_hp_moc = ty_le_hp_moc > WASTE_THRESHOLDS['hp_moc']
    canh_bao_hp_lo = ty_le_hp_lo > WASTE_THRESHOLDS['hp_lo']
    canh_bao_hp_tm = ty_le_hp_tm > WASTE_THRESHOLDS['hp_tm']
    canh_bao_hp_ht = ty_le_hp_ht > WASTE_THRESHOLDS['hp_ht']
    
    return WasteAnalysis(
        hp_moc=hp_moc,
        hp_lo=hp_lo,
        hp_tm=hp_tm,
        hp_ht=hp_ht,
        ty_le_hp_moc=round(ty_le_hp_moc, 2),
        ty_le_hp_lo=round(ty_le_hp_lo, 2),
        ty_le_hp_tm=round(ty_le_hp_tm, 2),
        ty_le_hp_ht=round(ty_le_hp_ht, 2),
        tong_hao_phi=tong_hao_phi,
        ty_le_tong_hp=round(ty_le_tong_hp, 2),
        canh_bao_hp_moc=canh_bao_hp_moc,
        canh_bao_hp_lo=canh_bao_hp_lo,
        canh_bao_hp_tm=canh_bao_hp_tm,
        canh_bao_hp_ht=canh_bao_hp_ht
    )


def calculate_efficiency_metrics(
    sl_ep: int,
    sl_truoc_lo: int,
    sl_sau_lo: int,
    sl_truoc_mai: int,
    sl_truoc_dong_hop: int
) -> EfficiencyMetrics:
    """Tính toán các chỉ số hiệu suất."""
    
    hieu_suat_moc = (sl_truoc_lo / sl_ep * 100) if sl_ep > 0 else 0
    hieu_suat_lo = (sl_sau_lo / sl_ep * 100) if sl_ep > 0 else 0
    hieu_suat_truoc_mai = (sl_truoc_mai / sl_ep * 100) if sl_ep > 0 else 0
    hieu_suat_thanh_pham = (sl_truoc_dong_hop / sl_ep * 100) if sl_ep > 0 else 0
    
    return EfficiencyMetrics(
        hieu_suat_moc=round(hieu_suat_moc, 2),
        hieu_suat_lo=round(hieu_suat_lo, 2),
        hieu_suat_truoc_mai=round(hieu_suat_truoc_mai, 2),
        hieu_suat_thanh_pham=round(hieu_suat_thanh_pham, 2)
    )


def calculate_quota_comparison(
    product_line: str,
    actual_production_units: int,
    production_date: date,
    brick_area_m2: float = 0.18  # 300x600mm = 0.18 m²
) -> Optional[QuotaComparison]:
    """
    So sánh sản lượng thực tế với mức khoán.
    
    Args:
        product_line: Dòng sản phẩm (ví dụ: "300x600mm")
        actual_production_units: Số viên gạch thực tế sản xuất
        production_date: Ngày sản xuất
        brick_area_m2: Diện tích 1 viên gạch (m²)
    """
    quota_info = QUOTA_DATA.get(product_line)
    if not quota_info:
        return None
    
    # Tính số ngày làm việc trong tháng (trừ 1.5 ngày bảo dưỡng)
    days_in_month = 30 if production_date.month in [4, 6, 9, 11] else 31
    if production_date.month == 2:
        days_in_month = 29 if production_date.year % 4 == 0 else 28
    
    working_days = days_in_month - 1.5
    
    # Mức khoán tháng
    monthly_quota = quota_info.get(f'quota_{days_in_month}', quota_info['quota_30'])
    
    # Mức khoán ngày
    daily_quota = monthly_quota / working_days
    
    # Quy đổi sản lượng thực tế sang m²
    actual_m2 = actual_production_units * brick_area_m2
    
    # So sánh
    chenh_lech = int(actual_m2 - daily_quota)
    ty_le_vuot_khoan = (chenh_lech / daily_quota * 100) if daily_quota > 0 else 0
    
    return QuotaComparison(
        product_line=product_line,
        san_luong_thuc_te=int(actual_m2),
        san_luong_khoan=int(daily_quota),
        chenh_lech=chenh_lech,
        ty_le_vuot_khoan=round(ty_le_vuot_khoan, 2),
        working_days=working_days
    )


# =============================================================================
# CLI COMMANDS
# =============================================================================

async def cmd_analyze_daily(args):
    """Analyze daily production with full metrics."""
    
    production_date = args.date
    cluster_id = args.cluster
    product_line = args.product_line
    
    # Date range for the day
    from_ts = datetime.combine(production_date, datetime.min.time())
    to_ts = datetime.combine(production_date, datetime.max.time())
    
    print(f"\n{'='*80}")
    print(f"PHÂN TÍCH SẢN XUẤT HÀNG NGÀY")
    print(f"Ngày: {production_date}")
    print(f"Cluster ID: {cluster_id}")
    print(f"Dòng sản phẩm: {product_line}")
    print(f"{'='*80}\n")
    
    # Fetch all measurements
    print("Đang tải dữ liệu từ database...")
    by_position = await fetch_all_position_measurements(cluster_id, from_ts, to_ts)
    # Calculate production at each stage
    print("\n--- SẢN LƯỢNG TỪNG CÔNG ĐOẠN ---\n")
    
    stages = {}
    for position, measurements_by_device in by_position.items():
        print(f"Công đoạn: {position.upper()}")
        stage_data = calculate_stage_production(measurements_by_device, position)
        stages[position] = stage_data
        print(f"  Tổng: {stage_data.total_count} viên\n")
    
    # Extract stage counts
    sl_ep = stages['ep'].total_count
    sl_truoc_lo = stages['truoc_lo'].total_count
    sl_sau_lo = stages['sau_lo'].total_count
    sl_truoc_mai = stages['truoc_mai'].total_count
    sl_sau_mai_canh = stages['sau_mai_canh'].total_count
    sl_truoc_dong_hop = stages['truoc_dong_hop'].total_count
    
    # Calculate waste analysis
    print("\n--- PHÂN TÍCH HAO PHÍ ---\n")
    waste = calculate_waste_analysis(
        sl_ep, sl_truoc_lo, sl_sau_lo, sl_truoc_mai, sl_truoc_dong_hop
    )
    
    print(f"Hao phí mộc (Ép → Trước lò):     {waste.hp_moc:,} viên ({waste.ty_le_hp_moc}%)")
    if waste.canh_bao_hp_moc:
        print(f"  ⚠️  CẢNH BÁO: Vượt ngưỡng {WASTE_THRESHOLDS['hp_moc']}%")
    
    print(f"Hao phí lò (Trước lò → Sau lò):  {waste.hp_lo:,} viên ({waste.ty_le_hp_lo}%)")
    if waste.canh_bao_hp_lo:
        print(f"  ⚠️  CẢNH BÁO: Vượt ngưỡng {WASTE_THRESHOLDS['hp_lo']}%")
    
    print(f"Hao phí trước mài:               {waste.hp_tm:,} viên ({waste.ty_le_hp_tm}%)")
    if waste.canh_bao_hp_tm:
        print(f"  ⚠️  CẢNH BÁO: Vượt ngưỡng {WASTE_THRESHOLDS['hp_tm']}%")
    
    print(f"Hao phí hoàn thiện:              {waste.hp_ht:,} viên ({waste.ty_le_hp_ht}%)")
    if waste.canh_bao_hp_ht:
        print(f"  ⚠️  CẢNH BÁO: Vượt ngưỡng {WASTE_THRESHOLDS['hp_ht']}%")
    
    print(f"\nTổng hao phí:                    {waste.tong_hao_phi:,} viên ({waste.ty_le_tong_hp}%)")
    
    # Calculate efficiency
    print("\n--- HIỆU SUẤT SẢN XUẤT ---\n")
    efficiency = calculate_efficiency_metrics(
        sl_ep, sl_truoc_lo, sl_sau_lo, sl_truoc_mai, sl_truoc_dong_hop
    )
    
    print(f"Hiệu suất công đoạn mộc:   {efficiency.hieu_suat_moc}%")
    print(f"Hiệu suất lò nung:         {efficiency.hieu_suat_lo}%")
    print(f"Hiệu suất trước mài:       {efficiency.hieu_suat_truoc_mai}%")
    print(f"Hiệu suất thành phẩm:      {efficiency.hieu_suat_thanh_pham}%")
    
    # Compare with quota
    if product_line:
        print("\n--- SO SÁNH VỚI MỨC KHOÁN ---\n")
        quota = calculate_quota_comparison(product_line, sl_truoc_dong_hop, production_date)
        
        if quota:
            print(f"Sản lượng thực tế:  {quota.san_luong_thuc_te:,} m²")
            print(f"Mức khoán ngày:     {quota.san_luong_khoan:,} m²")
            print(f"Chênh lệch:         {quota.chenh_lech:+,} m² ({quota.ty_le_vuot_khoan:+.2f}%)")
            
            if quota.ty_le_vuot_khoan > 0:
                print(f"✅ Vượt khoán {quota.ty_le_vuot_khoan}%")
            elif quota.ty_le_vuot_khoan < -10:
                print(f"❌ Không đạt khoán {abs(quota.ty_le_vuot_khoan)}%")
            else:
                print(f"⚠️  Gần đạt khoán")
        else:
            print(f"Không tìm thấy mức khoán cho dòng sản phẩm: {product_line}")
    
    # Generate report object
    report = DailyProductionReport(
        production_date=str(production_date),
        cluster_id=cluster_id,
        product_line=product_line or "Unknown",
        sl_ep=sl_ep,
        sl_truoc_lo=sl_truoc_lo,
        sl_sau_lo=sl_sau_lo,
        sl_truoc_mai=sl_truoc_mai,
        sl_sau_mai_canh=sl_sau_mai_canh,
        sl_truoc_dong_hop=sl_truoc_dong_hop,
        waste=waste,
        efficiency=efficiency,
        quota=quota if product_line else None
    )
    
    # Save to JSON file
    if args.output:
        output_file = args.output
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(asdict(report), f, indent=2, ensure_ascii=False, default=str)
        print(f"\n📁 Báo cáo đã lưu vào: {output_file}")
    
    print(f"\n{'='*80}\n")
    
    return report


async def cmd_calculate_waste(args):
    """Calculate waste/loss analysis only."""
    
    production_date = args.date
    cluster_id = args.cluster
    
    from_ts = datetime.combine(production_date, datetime.min.time())
    to_ts = datetime.combine(production_date, datetime.max.time())
    
    print(f"\nTính toán hao phí cho ngày {production_date}, cluster {cluster_id}...\n")
    
    by_position = await fetch_all_position_measurements(cluster_id, from_ts, to_ts)
    
    # Calculate stage counts
    sl_ep = calculate_stage_production(by_position['ep'], 'ep').total_count
    sl_truoc_lo = calculate_stage_production(by_position['truoc_lo'], 'truoc_lo').total_count
    sl_sau_lo = calculate_stage_production(by_position['sau_lo'], 'sau_lo').total_count
    sl_truoc_mai = calculate_stage_production(by_position['truoc_mai'], 'truoc_mai').total_count
    sl_truoc_dong_hop = calculate_stage_production(by_position['truoc_dong_hop'], 'truoc_dong_hop').total_count
    
    waste = calculate_waste_analysis(sl_ep, sl_truoc_lo, sl_sau_lo, sl_truoc_mai, sl_truoc_dong_hop)
    
    print(json.dumps(asdict(waste), indent=2, ensure_ascii=False))


async def cmd_compare_quota(args):
    """Compare actual production with quota."""
    
    production_date = args.date
    cluster_id = args.cluster
    product_line = args.product_line
    
    from_ts = datetime.combine(production_date, datetime.min.time())
    to_ts = datetime.combine(production_date, datetime.max.time())
    
    print(f"\nSo sánh với mức khoán cho {product_line} ngày {production_date}...\n")
    
    by_position = await fetch_all_position_measurements(cluster_id, from_ts, to_ts)
    sl_truoc_dong_hop = calculate_stage_production(
        by_position['truoc_dong_hop'], 'truoc_dong_hop'
    ).total_count
    
    quota = calculate_quota_comparison(product_line, sl_truoc_dong_hop, production_date)
    
    if quota:
        print(json.dumps(asdict(quota), indent=2, ensure_ascii=False))
    else:
        print(f"Không tìm thấy mức khoán cho dòng sản) phẩm: {product_line}")




def main():
    parser = argparse.ArgumentParser(description="Measurement CLI: fetch + analysis commands")
    sub = parser.add_subparsers(dest="cmd", required=False)

    # fetch (default behavior)
    p_fetch = sub.add_parser("fetch", help="Fetch raw measurements for a device")
    p_fetch.add_argument("--device", "-d", required=True, type=int, help="device_id (integer)")
    p_fetch.add_argument("--from", dest="from_ts", type=parse_iso, help="Start timestamp (ISO)")
    p_fetch.add_argument("--to", dest="to_ts", type=parse_iso, help="End timestamp (ISO)")
    p_fetch.add_argument("--limit", type=int, default=100, help="Limit number of rows")
    p_fetch.add_argument("--offset", type=int, default=0, help="Offset")

    # analyze-daily
    p_analyze = sub.add_parser("analyze-daily", help="Analyze daily production")
    p_analyze.add_argument("--date", required=True, type=parse_date, help="Production date YYYY-MM-DD")
    p_analyze.add_argument("--cluster", required=True, type=int, help="cluster id")
    p_analyze.add_argument("--product-line", dest="product_line", required=False, help="Product line (e.g. 300x600mm)")
    p_analyze.add_argument("--output", required=False, help="Output JSON file path")

    # calculate-waste
    p_waste = sub.add_parser("calculate-waste", help="Calculate waste/loss for a date + cluster")
    p_waste.add_argument("--date", required=True, type=parse_date, help="Production date YYYY-MM-DD")
    p_waste.add_argument("--cluster", required=True, type=int, help="cluster id")

    # compare-quota
    p_quota = sub.add_parser("compare-quota", help="Compare actual production with quota")
    p_quota.add_argument("--date", required=True, type=parse_date, help="Production date YYYY-MM-DD")
    p_quota.add_argument("--cluster", required=True, type=int, help="cluster id")
    p_quota.add_argument("--product-line", dest="product_line", required=True, help="Product line (e.g. 300x600mm)")

    # daily-report (alias of analyze-daily but with enforced output)
    p_report = sub.add_parser("daily-report", help="Generate daily report JSON")
    p_report.add_argument("--date", required=True, type=parse_date, help="Production date YYYY-MM-DD")
    p_report.add_argument("--cluster", required=True, type=int, help="cluster id")
    p_report.add_argument("--product-line", dest="product_line", required=False, help="Product line (e.g. 300x600mm)")
    p_report.add_argument("--output", required=False, help="Output JSON file path")

    # timeline: per-device ordered timeline for a date
    p_timeline = sub.add_parser("timeline", help="Fetch per-device timeline for a day (ordered by timestamp)")
    p_timeline.add_argument("--date", required=True, type=parse_date, help="Production date YYYY-MM-DD")
    p_timeline.add_argument("--cluster", required=True, type=int, help="cluster id")
    p_timeline.add_argument("--limit-per-device", dest="limit_per_device", type=int, required=False, help="Limit rows per device (most recent)")

    # fetch-counts: minimal timestamp + count pairs for a device
    p_fetch_counts = sub.add_parser("fetch-counts", help="Fetch timestamp + count pairs for a device")
    p_fetch_counts.add_argument("--device", "-d", required=True, type=int, help="device_id (integer)")
    p_fetch_counts.add_argument("--from", dest="from_ts", type=parse_iso, help="Start timestamp (ISO)")
    p_fetch_counts.add_argument("--to", dest="to_ts", type=parse_iso, help="End timestamp (ISO)")
    p_fetch_counts.add_argument("--limit", type=int, default=1000, help="Limit number of rows")

    # If user provided no subcommand, default to fetch with previous flags
    # To maintain backward compatibility, also parse flags at the top level
    if len(sys.argv) == 1:
        parser.print_help()
        return

    args = parser.parse_args()

    # Dispatch commands
    if args.cmd == "fetch":
        data = asyncio.run(fetch(args.device, args.from_ts, args.to_ts, args.limit, args.offset))
        print(json.dumps({"device_id": args.device, "count": len(data), "data": data}, indent=2, default=str))
    elif args.cmd == "fetch-counts":
        # Use the same DB fetch but output only timestamp + count
        data = asyncio.run(fetch_measurements_by_device(args.device, getattr(args, 'from_ts', None), getattr(args, 'to_ts', None), getattr(args, 'limit', 1000)))
        pairs = [serialize_timestamp_count(m) for m in data]
        print(json.dumps({"device_id": args.device, "count": len(pairs), "data": pairs}, indent=2, default=str, ensure_ascii=False))
    elif args.cmd == "analyze-daily":
        asyncio.run(cmd_analyze_daily(args))
    elif args.cmd == "calculate-waste":
        asyncio.run(cmd_calculate_waste(args))
    elif args.cmd == "timeline":
        timeline = asyncio.run(fetch_timeline_by_device_for_day(args.cluster, args.date, getattr(args, 'limit_per_device', None)))
        # Convert each device's measurements to timestamp+count pairs
        timeline_counts = {}
        for dev_id, measurements in timeline.items():
            pairs = [serialize_timestamp_count(m) for m in measurements]
            timeline_counts[str(dev_id)] = pairs

        # print as JSON with string keys
        print(json.dumps(timeline_counts, indent=2, default=str, ensure_ascii=False))
    elif args.cmd == "compare-quota":
        asyncio.run(cmd_compare_quota(args))
    elif args.cmd == "daily-report":
        # ensure output default
        if not args.output:
            args.output = f"daily_report_{args.date}.json"
        asyncio.run(cmd_analyze_daily(args))
    else:
        # Fallback: if user invoked script with positional style (old behavior)
        if hasattr(args, 'device') and args.device:
            data = asyncio.run(fetch(args.device, getattr(args, 'from_ts', None), getattr(args, 'to_ts', None), getattr(args, 'limit', 100), getattr(args, 'offset', 0)))
            print(json.dumps({"device_id": args.device, "count": len(data), "data": data}, indent=2, default=str))
        else:
            parser.print_help()
            return

if __name__ == "__main__":
    main()

    # python get_measurements.py --device 123 --from 2025-11-21T00:00:00 --to 2025-11-22T00:00:00 --limit 100

# python get_measurements.py fetch --device 1 --from 2025-11-21T00:00:00 --to 2025-11-22T00:00:00 --limit 200

# python get_measurements.py analyze-daily --date 2025-11-21 --cluster 1 --product-line "300x600mm" --output report_2025-11-21.json

# python .\get_measurements.py calculate-waste --date 2025-11-21 --cluster 1

# python .\get_measurements.py compare-quota --date 2025-11-21 --cluster 1 --product-line "300x600mm"

# python get_measurements.py daily-report --date 2025-11-21 --cluster 1 --product-line "300x600mm" --output daily_report_2025-11-21.jsonpython .\get_measurements.py daily-report --date 2025-11-21 --cluster 1 --product-line "300x600mm" --output daily_report_2025-11-21.json

# python get_measurements.py timeline --date 2025-11-15 --cluster 1 --limit-per-device 100