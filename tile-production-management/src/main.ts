import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';

// Device data cho PX-01, DC-01
const DEVICES_DATA = [
  {
    name: 'Sau máy ép 1',
    deviceId: 'SAU-ME-01',
    type: 'counter',
    serial_number: 'SAU-ME-01-2024',
    position: 'Sau máy ép 1',
    description: 'Máy đếm gạch tại vị trí sau máy ép 1',
  },
  {
    name: 'Sau máy ép 2',
    deviceId: 'SAU-ME-02',
    type: 'counter',
    serial_number: 'SAU-ME-02-2024',
    position: 'Sau máy ép 2',
    description: 'Máy đếm gạch tại vị trí sau máy ép 2',
  },
  {
    name: 'Trước lò nung 1',
    deviceId: 'TRUOC-LN-01',
    type: 'counter',
    serial_number: 'TRUOC-LN-01-2024',
    position: 'Trước lò nung 1',
    description: 'Máy đếm gạch tại vị trí trước lò nung 1',
  },
  {
    name: 'Trước lò nung 2',
    deviceId: 'TRUOC-LN-02',
    type: 'counter',
    serial_number: 'TRUOC-LN-02-2024',
    position: 'Trước lò nung 2',
    description: 'Máy đếm gạch tại vị trí trước lò nung 2',
  },
  {
    name: 'Sau lò nung 1',
    deviceId: 'SAU-LN-01',
    type: 'counter',
    serial_number: 'SAU-LN-01-2024',
    position: 'Sau lò nung 1',
    description: 'Máy đếm gạch tại vị trí sau lò nung 1',
  },
  {
    name: 'Trước mài mặt 1',
    deviceId: 'TRUOC-MM-01',
    type: 'counter',
    serial_number: 'TRUOC-MM-01-2024',
    position: 'Trước mài mặt 1',
    description: 'Máy đếm gạch tại vị trí trước mài mặt 1',
  },
  {
    name: 'Sau mài cạnh 1',
    deviceId: 'SAU-MC-01',
    type: 'counter',
    serial_number: 'SAU-MC-01-2024',
    position: 'Sau mài cạnh 1',
    description: 'Máy đếm gạch tại vị trí sau mài cạnh 1',
  },
  {
    name: 'Trước đóng hộp 1',
    deviceId: 'TRUOC-DH-01',
    type: 'counter',
    serial_number: 'TRUOC-DH-01-2024',
    position: 'Trước đóng hộp 1',
    description: 'Máy đếm gạch tại vị trí trước đóng hộp 1',
  },
];

async function seedDevices(dataSource: DataSource) {
  console.log('🚀 Auto-seeding devices for PX-01, DC-01...\n');

  try {
    // 1. Tìm hoặc tạo Workshop PX-01
    let workshop = await dataSource.query(
      `SELECT id, name FROM workshops WHERE name ILIKE '%phân xưởng 1%' OR name ILIKE '%PX-01%' OR name ILIKE '%PX01%' LIMIT 1`
    );

    let workshopId;
    if (!workshop || workshop.length === 0) {
      console.log('📝 Creating Workshop PX-01...');
      const result = await dataSource.query(
        `INSERT INTO workshops (name, location) VALUES ('Phân xưởng 1', 'Nhà máy chính') RETURNING id, name`
      );
      workshopId = result[0].id;
      console.log(`✅ Created Workshop: ${result[0].name} (ID: ${workshopId})\n`);
    } else {
      workshopId = workshop[0].id;
      console.log(`✅ Found Workshop: ${workshop[0].name} (ID: ${workshopId})\n`);
    }

    // 2. Tìm hoặc tạo Production Line DC-01
    let productionLine = await dataSource.query(
      `SELECT id, name FROM production_lines WHERE (name ILIKE '%dây chuyền 1%' OR name ILIKE '%DC-01%' OR name ILIKE '%DC01%') AND "workshopId" = $1 LIMIT 1`,
      [workshopId]
    );

    let productionLineId;
    if (!productionLine || productionLine.length === 0) {
      console.log('📝 Creating Production Line DC-01...');
      const result = await dataSource.query(
        `INSERT INTO production_lines (name, description, capacity, "workshopId") 
         VALUES ('Dây chuyền 1', 'Dây chuyền sản xuất số 1', 10000, $1) RETURNING id, name`,
        [workshopId]
      );
      productionLineId = result[0].id;
      console.log(`✅ Created Production Line: ${result[0].name} (ID: ${productionLineId})\n`);
    } else {
      productionLineId = productionLine[0].id;
      console.log(`✅ Production Line: ${productionLine[0].name} (ID: ${productionLineId})\n`);
    }

    // 3. Tạo Positions và Devices
    console.log('📦 Creating positions and devices...\n');

    for (const deviceData of DEVICES_DATA) {
      // Kiểm tra device đã tồn tại chưa
      const existingDevice = await dataSource.query(
        `SELECT id FROM devices WHERE "deviceId" = $1 LIMIT 1`,
        [deviceData.deviceId]
      );

      if (existingDevice && existingDevice.length > 0) {
        console.log(`   ✓ Device already exists: ${deviceData.deviceId}`);
        continue;
      }

      console.log(`   Processing: ${deviceData.name} (${deviceData.deviceId})`);

      // Kiểm tra position đã tồn tại chưa
      let position = await dataSource.query(
        `SELECT id FROM positions WHERE name = $1 AND "productionLineId" = $2 LIMIT 1`,
        [deviceData.position, productionLineId]
      );

      let positionId;

      if (!position || position.length === 0) {
        // Tạo position mới
        const result = await dataSource.query(
          `INSERT INTO positions (name, description, "productionLineId") 
           VALUES ($1, $2, $3) RETURNING id`,
          [deviceData.position, `Vị trí ${deviceData.position}`, productionLineId]
        );
        positionId = result[0].id;
        console.log(`      ✓ Created position: ${deviceData.position} (ID: ${positionId})`);
      } else {
        positionId = position[0].id;
      }

      // Tạo device mới
      await dataSource.query(
        `INSERT INTO devices ("deviceId", name, type, serial_number, status, "positionId", installation_date) 
         VALUES ($1, $2, $3, $4, 'online', $5, CURRENT_DATE)`,
        [deviceData.deviceId, deviceData.name, deviceData.type, deviceData.serial_number, positionId]
      );

      console.log(`      ✓ Created device: ${deviceData.deviceId}`);
    }

    console.log('\n✅ Device seeding completed!\n');
  } catch (error) {
    console.error('❌ Error during auto-seeding:', error);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  
  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  // Auto-seed devices on startup
  const dataSource = app.get(DataSource);
  await seedDevices(dataSource);
  
  await app.listen(process.env.PORT ?? 5555);
  console.log(`🚀 Application is running on: http://localhost:${process.env.PORT ?? 5555}`);
}
bootstrap();
