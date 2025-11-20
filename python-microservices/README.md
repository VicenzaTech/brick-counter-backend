# IoT Data Processing Microservices

Hệ thống Python microservices để xử lý dữ liệu IoT từ bảng raw `measurements` và chuyển đổi thành các domain-specific data.

## 📁 Cấu trúc thư mục

```
python-microservices/
├── shared/                          # Shared infrastructure cho tất cả services
│   ├── __init__.py
│   ├── database.py                  # Database connection & session management
│   ├── models.py                    # SQLAlchemy models (measurements, base tables)
│   └── utils/
│       ├── __init__.py
│       ├── timestamp.py             # Timestamp utilities
│       ├── json_parser.py           # JSON parsing helpers
│       └── logger.py                # Logging configuration
│
├── services/                        # Các microservices riêng biệt
│   ├── brick_production_service/    # Service xử lý dữ liệu sản xuất gạch
│   │   ├── __init__.py
│   │   ├── main.py                  # Entry point
│   │   ├── repository/              # Data access layer
│   │   │   ├── __init__.py
│   │   │   ├── measurement_repo.py
│   │   │   └── production_repo.py
│   │   ├── service/                 # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── etl_service.py
│   │   │   └── kpi_calculator.py
│   │   ├── analytics/               # Analytics & ML layer
│   │   │   ├── __init__.py
│   │   │   ├── time_series.py
│   │   │   └── anomaly_detector.py
│   │   ├── schemas/                 # Pydantic models
│   │   │   ├── __init__.py
│   │   │   ├── input_schema.py
│   │   │   └── output_schema.py
│   │   └── config.py                # Service-specific config
│   │
│   ├── moisture_analysis_service/   # Service phân tích độ ẩm
│   │   └── ... (cấu trúc tương tự)
│   │
│   └── machine_monitoring_service/  # Service giám sát máy móc
│       └── ... (cấu trúc tương tự)
│
├── migrations/                      # Alembic migrations
│   └── versions/
│
├── tests/                           # Unit & integration tests
│   ├── shared/
│   ├── services/
│   └── conftest.py
│
├── docker-compose.yml               # Local development environment
├── requirements.txt                 # Dependencies
└── .env.example                     # Environment variables template
```

## 🚀 Quick Start

### 1. Cài đặt dependencies

```bash
cd python-microservices
pip install -r requirements.txt
```

### 2. Cấu hình database

Copy `.env.example` thành `.env` và điều chỉnh:

```bash
DB_HOST=localhost
DB_PORT=5450
DB_NAME=brick-counter-dev
DB_USER=postgres
DB_PASSWORD=123456
```

### 3. Chạy service

```bash
# Chạy brick production service
python -m services.brick_production_service.main

# Hoặc với arguments
python -m services.brick_production_service.main --device-id SAU-ME-01 --date 2025-11-20
```

## 📊 Kiến trúc Layer

### Repository Layer
- Truy vấn database bằng SQLAlchemy
- Chỉ chứa query logic, không có business logic
- Trả về SQLAlchemy models hoặc raw data

### Service Layer
- ETL: Extract, Transform, Load
- Chuẩn hóa dữ liệu từ JSONB
- Tính toán KPI nghiệp vụ
- Validate bằng Pydantic schemas

### Analytics Layer
- Time series analysis (rolling window, moving average)
- Statistical analysis (mean, std, percentiles)
- Anomaly detection
- Predictive modeling (optional)

### Schema Layer
- Pydantic models cho validation
- Input schemas: validate raw measurements
- Output schemas: validate domain results
- Transformation schemas: intermediate data

## 🔧 Mở rộng cho nghiệp vụ mới

### Bước 1: Clone template service

```bash
cp -r services/brick_production_service services/your_new_service
```

### Bước 2: Cập nhật config

Sửa `services/your_new_service/config.py`:

```python
SERVICE_NAME = "your_new_service"
INPUT_TABLE = "measurements"
OUTPUT_TABLE = "your_domain_table"
```

### Bước 3: Định nghĩa schemas

Sửa `schemas/input_schema.py` và `output_schema.py` theo nghiệp vụ của bạn.

### Bước 4: Implement business logic

Sửa `service/etl_service.py` và `service/kpi_calculator.py`.

### Bước 5: Chạy migration

```bash
alembic revision --autogenerate -m "Add your_domain_table"
alembic upgrade head
```

## 📖 Ví dụ sử dụng

```python
from services.brick_production_service.main import BrickProductionProcessor
from datetime import datetime, timedelta

# Khởi tạo processor
processor = BrickProductionProcessor()

# Xử lý dữ liệu cho 1 device trong 1 ngày
results = processor.process_device(
    device_id="SAU-ME-01",
    start_time=datetime(2025, 11, 20, 0, 0),
    end_time=datetime(2025, 11, 20, 23, 59)
)

print(f"Processed {len(results)} records")
```

## 🧪 Testing

```bash
# Chạy tất cả tests
pytest

# Chạy tests cho 1 service
pytest tests/services/brick_production_service/

# Chạy với coverage
pytest --cov=services --cov-report=html
```

## 📝 Conventions

- **Naming**: snake_case cho files, functions, variables
- **Docstrings**: Google style docstrings
- **Type hints**: Bắt buộc cho tất cả public functions
- **Logging**: Sử dụng shared logger, không print()
- **Error handling**: Raise custom exceptions, log errors

## 🔐 Security

- Không commit `.env` file
- Sử dụng environment variables cho credentials
- Validate tất cả input từ database
- Sanitize JSON data trước khi xử lý

## 📊 Monitoring

- Mỗi service tự log metrics
- Log format: JSON structured logs
- Metrics: processing time, record count, error rate
- Health check endpoint (future)

## 🤝 Contributing

1. Tạo branch mới từ `main`
2. Implement feature/fix
3. Viết tests
4. Submit PR với description chi tiết
