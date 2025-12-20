# Brick Types Seed Data

Thư mục này chứa dữ liệu seed cho các loại gạch trong hệ thống.

## Cấu trúc

- `brick-types.data.ts`: File chứa dữ liệu các loại gạch sẽ được seed vào database khi khởi động ứng dụng

## Cách thay đổi dữ liệu seed

### 1. Chỉnh sửa file `brick-types.data.ts`

File này chứa 2 object chính:

#### `newBrickTypes`
Chứa danh sách đầy đủ các loại gạch với thông tin chi tiết:
- `name`: Tên loại gạch
- `workshop`: Phân xưởng (ví dụ: "Phân xưởng 1", "Phân xưởng 2")
- `productionLine`: Dây chuyền sản xuất (ví dụ: "Dây chuyền 1", "Dây chuyền 2")
- `tileSize`: Kích thước gạch
- `contractCycle`: Chu kỳ hợp đồng
- `kilnOutput`: Sản lượng lò nung
- `qualityProductOutput`: Sản lượng sản phẩm đạt chất lượng
- `deductionDays`: Số ngày khấu trừ
- `contractProduction`: Sản xuất theo hợp đồng
- `additionalContractWhenReducingCycle`: Hợp đồng bổ sung khi giảm chu kỳ
- `reducedContractWhenIncreasingCycle`: Giảm hợp đồng khi tăng chu kỳ
- `unit`: Đơn vị (m2, viên, ...)
- `specs`: Thông số kỹ thuật (width, height, type, thickness, finish, ...)

#### `baseProduct`
Chứa danh sách các loại gạch cơ bản (legacy support)

### 2. Thêm loại gạch mới

Để thêm một loại gạch mới, thêm object vào mảng `brickTypes` trong `newBrickTypes`:

```typescript
{
    "name": "Tên loại gạch mới",
    "workshop": "Phân xưởng X",
    "productionLine": "Dây chuyền X",
    "tileSize": "XXXxYYYmm",
    "contractCycle": 50,
    "kilnOutput": 10000,
    "qualityProductOutput": 9500,
    "deductionDays": 1.5,
    "contractProduction": 270000,
    "additionalContractWhenReducingCycle": 280000,
    "reducedContractWhenIncreasingCycle": -150,
    "unit": "m2",
    "specs": {
        "width": XXX,
        "height": YYY,
        "type": "Loại gạch",
        "finish": "Hoàn thiện" // optional
    }
}
```

### 3. Xóa hoặc chỉnh sửa loại gạch

- **Xóa**: Xóa object tương ứng khỏi mảng `brickTypes`
- **Chỉnh sửa**: Thay đổi các giá trị trong object

### 4. Áp dụng thay đổi

Sau khi chỉnh sửa file, các thay đổi sẽ được áp dụng khi:

#### Khi chạy với Docker:
```bash
# Rebuild và restart container
docker-compose up --build -d
```

#### Khi chạy development:
```bash
# Restart ứng dụng
npm run start:dev
```

## Lưu ý

- Dữ liệu seed chỉ được insert nếu chưa tồn tại trong database (kiểm tra theo `name`, `workshop`, và `productionLine`)
- Nếu muốn re-seed dữ liệu đã tồn tại, cần xóa dữ liệu cũ trong database trước
- File này được import và sử dụng trong `src/main.ts` khi ứng dụng khởi động
