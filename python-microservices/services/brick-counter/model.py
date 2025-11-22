from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    DateTime,
    JSON,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), primary_key=True)

    device_id = Column(Integer, index=True, nullable=False)
    cluster_id = Column(Integer, nullable=True)
    type_id = Column(Integer, nullable=False)

    ingest_time = Column(DateTime(timezone=True))
    data = Column(JSON)

    # Relations to Device/Cluster/Type are optional for this lightweight CLI.
    # They were removed to avoid import/mapper errors when those classes
    # are not defined in this service. If you later add full models for
    # Device/DeviceCluster/MeasurementType, re-add relationship() here.

# Index giống TypeORM
Index("idx_timestamp", Measurement.timestamp)
Index("idx_device_timestamp", Measurement.device_id, Measurement.timestamp)