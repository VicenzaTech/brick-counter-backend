
/**
 * Script tạo devices cho Phân xưởng 1 (PX-01), Dây chuyền 1 (DC-01)
 * Chạy script: npx ts-node scripts/seed-devices-px01-dc01.ts
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Device data cho PX-01, DC-01
const DEVICES_DATA = [
  {
    name: 'Máy Đếm Sấu Lệnh',
    deviceId: 'SAU-LN-01',
    type: 'counter',
    serial_number: 'SAU-LN-01-2024',
    position: 'Sấu - Lệnh',
    description: 'Máy đếm gạch tại vị trí sấu lệnh',
  },
  {
    name: 'Máy Đếm Sấu Mới',
    deviceId: 'SAU-ME-01',
    type: 'counter',
    serial_number: 'SAU-ME-01-2024',
    position: 'Sấu - Mới',
    description: 'Máy đếm gạch tại vị trí sấu mới',
  },
  {
    name: 'Máy Đếm Sấu Mới 2',
    deviceId: 'SAU-ME-02',
    type: 'counter',
    serial_number: 'SAU-ME-02-2024',
    position: 'Sấu - Mới 2',
    description: 'Máy đếm gạch tại vị trí sấu mới 2',
  },
  {
    name: 'Máy Đếm Sấu Mới Cũ',
    deviceId: 'SAU-MC-01',
    type: 'counter',
    serial_number: 'SAU-MC-01-2024',
    position: 'Sấu - Mới Cũ',
    description: 'Máy đếm gạch tại vị trí sấu mới cũ',
  },
  {
    name: 'Máy Đếm Trước Dầm Hồng',
    deviceId: 'TRUOC-DH-01',
    type: 'counter',
    serial_number: 'TRUOC-DH-01-2024',
    position: 'Trước Dầm Hồng',
    description: 'Máy đếm gạch tại vị trí trước dầm hồng',
  },
];

async function seedDevices() {
  console.log('🚀 Starting device seeding for PX-01, DC-01...\n');

  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5450'),
    username: process.env.DB_USERNAME || 'vicenza',
    password: process.env.DB_PASSWORD || 'vicenza123',
    database: process.env.DB_NAME || 'brick-counter-dev',
    entities: ['src/**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established\n');

    // 1. Tìm Workshop PX-01
    const workshop = await dataSource.query(
      `SELECT id, name FROM workshops WHERE code = 'PX-01' LIMIT 1`
    );

    if (!workshop || workshop.length === 0) {
      console.error('❌ Workshop PX-01 not found! Please create workshop first.');
      console.log('   Run: INSERT INTO workshops (name, code, location) VALUES (\'Phân xưởng 1\', \'PX-01\', \'Nhà máy chính\');');
      return;
    }

    const workshopId = workshop[0].id;
    console.log(`✅ Found Workshop: ${workshop[0].name} (ID: ${workshopId})\n`);

    // 2. Tìm hoặc tạo Production Line DC-01
    let productionLine = await dataSource.query(
      `SELECT id, name FROM production_lines WHERE code = 'DC-01' AND "workshopId" = $1 LIMIT 1`,
      [workshopId]
    );

    if (!productionLine || productionLine.length === 0) {
      console.log('📝 Creating Production Line DC-01...');
      await dataSource.query(
        `INSERT INTO production_lines (name, code, description, capacity, "workshopId") 
         VALUES ('Dây chuyền 1', 'DC-01', 'Dây chuyền sản xuất số 1', 10000, $1)`,
        [workshopId]
      );
      
      productionLine = await dataSource.query(
        `SELECT id, name FROM production_lines WHERE code = 'DC-01' AND "workshopId" = $1 LIMIT 1`,
        [workshopId]
      );
    }

    const productionLineId = productionLine[0].id;
    console.log(`✅ Production Line: ${productionLine[0].name} (ID: ${productionLineId})\n`);

    // 3. Tạo Positions và Devices
    console.log('📦 Creating positions and devices...\n');

    for (const deviceData of DEVICES_DATA) {
      console.log(`   Processing: ${deviceData.name} (${deviceData.deviceId})`);

      // Kiểm tra position đã tồn tại chưa
      let position = await dataSource.query(
        `SELECT id FROM positions WHERE name = $1 AND "productionLineId" = $2 LIMIT 1`,
        [deviceData.position, productionLineId]
      );

      let positionId: number;

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
        console.log(`      ✓ Position exists: ${deviceData.position} (ID: ${positionId})`);
      }

      // Kiểm tra device đã tồn tại chưa
      const existingDevice = await dataSource.query(
        `SELECT id FROM devices WHERE serial_number = $1 LIMIT 1`,
        [deviceData.serial_number]
      );

      if (existingDevice && existingDevice.length > 0) {
        console.log(`      ⚠️  Device already exists: ${deviceData.deviceId}\n`);
        continue;
      }

      // Tạo device mới
      await dataSource.query(
        `INSERT INTO devices ("deviceId", name, type, serial_number, status, "positionId", installation_date) 
         VALUES ($1, $2, $3, $4, 'online', $5, CURRENT_DATE)`,
        [deviceData.deviceId, deviceData.name, deviceData.type, deviceData.serial_number, positionId]
      );

      console.log(`      ✓ Created device: ${deviceData.deviceId}\n`);
    }

    console.log('\n✅ Device seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Workshop: PX-01`);
    console.log(`   - Production Line: DC-01`);
    console.log(`   - Devices created: ${DEVICES_DATA.length}`);
    console.log(`\n💡 Device IDs for MQTT testing:`);
    DEVICES_DATA.forEach(d => console.log(`   - ${d.deviceId}`));

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the seeding script
seedDevices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
