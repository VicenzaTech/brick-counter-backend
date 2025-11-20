# Service Extension Guide

Hướng dẫn tạo microservice mới từ template

## 📋 Bước 1: Clone Template

```bash
# Copy structure từ brick_production_service
cp -r services/brick_production_service services/your_service_name
```

## 📝 Bước 2: Cập nhật config.py

```python
# services/your_service_name/config.py

SERVICE_NAME = "your_service_name"
SENSOR_TYPE = "your_sensor_type"  # 'moisture', 'machine_monitoring', etc.
OUTPUT_TABLE = "your_domain_stats"

# Thêm config riêng cho service của bạn
YOUR_SPECIFIC_THRESHOLD = 100.0
```

## 🗄️ Bước 3: Tạo Database Model

Thêm model vào `shared/models.py`:

```python
class YourDomainStat(Base):
    """Domain-specific table for your service"""
    __tablename__ = "your_domain_stats"
    
    id = Column(Integer, primary_key=True)
    device_id = Column(String(50), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False)
    
    # Thêm các fields riêng cho domain của bạn
    your_metric_1 = Column(Float)
    your_metric_2 = Column(Integer)
    # ...
```

Chạy migration:

```bash
alembic revision --autogenerate -m "Add your_domain_stats table"
alembic upgrade head
```

## 📊 Bước 4: Định nghĩa Schemas

### Input Schema (`schemas/input_schema.py`):

```python
from pydantic import BaseModel, Field

class YourSensorData(BaseModel):
    """Schema cho JSONB data từ sensor của bạn"""
    value1: float = Field(..., description="First value")
    value2: int = Field(..., description="Second value")
    # ...
```

### Output Schema (`schemas/output_schema.py`):

```python
class YourStatOutput(BaseModel):
    """Schema cho kết quả xử lý"""
    device_id: str
    start_time: datetime
    end_time: datetime
    
    # Metrics riêng của bạn
    avg_value1: float
    max_value2: int
    # ...
```

## 🔧 Bước 5: Implement Business Logic

### ETL Service (`service/etl_service.py`):

```python
class ETLService:
    def extract_measurements(self, raw_measurements):
        # Validate và extract data từ JSONB
        pass
    
    def transform_to_time_series(self, measurements):
        # Chuyển đổi thành time series
        pass
    
    def calculate_your_specific_metrics(self, time_series):
        # Tính toán metrics riêng
        pass
```

### KPI Calculator (`service/kpi_calculator.py`):

```python
class KPICalculator:
    def calculate_your_kpis(self, time_series):
        # Tính toán KPIs cho domain của bạn
        return {
            'kpi1': value1,
            'kpi2': value2
        }
```

## 📈 Bước 6: Analytics (Optional)

### Time Series Analysis:

```python
from services.brick_production_service.analytics import TimeSeriesAnalyzer

analyzer = TimeSeriesAnalyzer(window_size_minutes=30)
rolling_avg = analyzer.rolling_average(time_series, field='your_field')
```

### Anomaly Detection:

```python
from services.brick_production_service.analytics import AnomalyDetector

detector = AnomalyDetector(threshold_std=2.5)
anomalies = detector.detect_statistical_anomalies(time_series)
```

## 🚀 Bước 7: Main Processor

Cập nhật `main.py`:

```python
class YourServiceProcessor:
    def __init__(self):
        self.etl_service = ETLService()
        self.kpi_calculator = KPICalculator()
        # ...
    
    def process_device(self, device_id, start_time, end_time):
        # 1. Load measurements
        # 2. Transform data
        # 3. Calculate metrics
        # 4. Save results
        pass
```

## ✅ Bước 8: Testing

Tạo test file `tests/services/your_service_name/test_processor.py`:

```python
import pytest
from services.your_service_name.main import YourServiceProcessor

def test_process_device():
    processor = YourServiceProcessor()
    result = processor.process_device(
        device_id="TEST-01",
        start_time=datetime(2025, 11, 20, 0, 0),
        end_time=datetime(2025, 11, 20, 23, 59)
    )
    assert result is not None
```

## 📝 Checklist

- [ ] Clone template structure
- [ ] Update SERVICE_NAME và config
- [ ] Tạo database model trong shared/models.py
- [ ] Chạy Alembic migration
- [ ] Định nghĩa input/output schemas
- [ ] Implement ETL logic
- [ ] Implement KPI calculation
- [ ] (Optional) Add analytics
- [ ] Update main processor
- [ ] Viết tests
- [ ] Test với dữ liệu thật
- [ ] Document API và usage

## 🎯 Best Practices

1. **Separation of Concerns**: Mỗi layer có trách nhiệm riêng
   - Repository: Database access only
   - Service: Business logic
   - Analytics: Statistical analysis
   - Schemas: Validation

2. **Type Safety**: Luôn sử dụng type hints
   ```python
   def process_data(data: List[Dict[str, Any]]) -> Optional[Result]:
       pass
   ```

3. **Error Handling**: Log errors và raise exceptions rõ ràng
   ```python
   try:
       result = process()
   except Exception as e:
       logger.error("Processing failed", error=str(e))
       raise
   ```

4. **Logging**: Sử dụng structured logging
   ```python
   logger.info("Processing started", device_id=device_id, count=100)
   ```

5. **Validation**: Validate tất cả input với Pydantic
   ```python
   validated_data = YourSchema.model_validate(raw_data)
   ```

## 📚 Tài liệu tham khảo

- SQLAlchemy docs: https://docs.sqlalchemy.org/
- Pydantic docs: https://docs.pydantic.dev/
- Structlog docs: https://www.structlog.org/
