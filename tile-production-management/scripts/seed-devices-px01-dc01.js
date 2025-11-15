/**
 * Script tạo devices cho Phân xưởng 1 (PX-01), Dây chuyền 1 (DC-01)
 * Chạy script: node scripts/seed-devices-px01-dc01.js
 */

const { DataSource } = require('typeorm');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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

async function seedDevices() {
  console.log('🚀 Starting device seeding for PX-01, DC-01...\n');

  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5450'),
    username: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'brick-counter-dev',
    entities: ['src/**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established\n');

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
