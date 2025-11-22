import { DataSource } from 'typeorm';
import { Measurement } from '../dist/measurement/entities/measurement.entity';
import { MeasurementType } from '../dist/measurement-types/entities/measurement-types.entity';
import { DeviceCluster } from '../dist/device-clusters/entities/device-cluster.entity';

// Device configuration for production line 1
const DEVICES = [
  { id: 1, code: 'SAU-ME-01', name: 'Sau máy ép 1', clusterId: 1 },
  { id: 2, code: 'SAU-ME-02', name: 'Sau máy ép 2', clusterId: 1 },
  { id: 3, code: 'TRUOC-LN-01', name: 'Trước lò nung 1', clusterId: 1 },
  { id: 4, code: 'TRUOC-LN-02', name: 'Trước lò nung 2', clusterId: 1 },
  { id: 5, code: 'SAU-LN-01', name: 'Sau lò nung 1', clusterId: 1 },
  { id: 6, code: 'TRUOC-MM-01', name: 'Trước mài mặt 1', clusterId: 1 },
  { id: 7, code: 'SAU-MC-01', name: 'Sau mài cạnh 1', clusterId: 1 },
  { id: 8, code: 'TRUOC-DH-01', name: 'Trước đóng hộp 1', clusterId: 1 },
];

/**
 * Generate measurement data for brick counter
 */
function generateMeasurementData(
  deviceId,
  count,
  errorCount = 0,
) {
  return {
    ts: new Date().toISOString(),
    deviceId,
    schemaVer: 1,
    metrics: {
      count,
      error_count: errorCount,
    },
    quality: {
      rssi: Math.floor(Math.random() * 60) - 90, // -90 to -30
    },
  };
}

/**
 * Seed brick counter measurements
 */
async function seedMeasurements(dataSource) {
  const measurementRepository = dataSource.getRepository(Measurement);
  const measurementTypeRepository = dataSource.getRepository(MeasurementType);

  try {
    // Get or create measurement type for brick counter
    let measurementType = await measurementTypeRepository.findOne({
      where: { code: 'COUNT_BRICK' },
    });

    if (!measurementType) {
      measurementType = measurementTypeRepository.create({
        code: 'COUNT_BRICK',
        name: 'Đếm gạch',
        data_schema: {
          count: 'number',
          error_count: 'number',
        },
        data_schema_version: 1,
        description: 'Counter sensor for brick production',
      });
      await measurementTypeRepository.save(measurementType);
      console.log('✓ Measurement type created: COUNT_BRICK');
    }

    // Generate measurements for each device
    const measurements = [];
    const numDays = 7;
    const measurementsPerDevicePerDay = 10;
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - numDays);

    for (const device of DEVICES) {
      // Track counter for this device across all days
      let currentCount = Math.floor(Math.random() * 400) + 100; // 100-500

      for (let dayOffset = 0; dayOffset < numDays; dayOffset++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(currentDate.getDate() + dayOffset);

        for (let i = 0; i < measurementsPerDevicePerDay; i++) {
          // Random time during the day
          const hour = Math.floor(Math.random() * 24);
          const minute = Math.floor(Math.random() * 60);
          const second = Math.floor(Math.random() * 60);

          const timestamp = new Date(currentDate);
          timestamp.setHours(hour, minute, second);

          // Increment counter (simulate production)
          // 70% chance to increment normally, 20% chance to increment more, 10% chance to reset
          const rand = Math.random();
          if (rand < 0.7) {
            // Normal increment: 5-20 units
            currentCount += Math.floor(Math.random() * 16) + 5;
          } else if (rand < 0.9) {
            // Burst increment: 50-200 units
            currentCount += Math.floor(Math.random() * 151) + 50;
          } else {
            // Reset (device restart or line reset)
            currentCount = Math.floor(Math.random() * 50);
          }

          // Error count occasionally increases
          const errorCount =
            Math.random() < 0.3 ? Math.floor(Math.random() * 5) : 0;

          const measurement = measurementRepository.create({
            device_id: device.id,
            cluster_id: device.clusterId,
            type_id: measurementType.id,
            timestamp,
            ingest_time: new Date(),
            data: generateMeasurementData(
              device.code,
              currentCount,
              errorCount,
            ),
          });

          measurements.push(measurement);
        }
      }
    }

    // Bulk insert measurements
    await measurementRepository.save(measurements, { chunk: 100 });

    console.log(`✓ Successfully seeded ${measurements.length} measurements`);
    console.log(`  - Devices: ${DEVICES.length}`);
    console.log(`  - Days: ${numDays}`);
    console.log(
      `  - Measurements per device per day: ${measurementsPerDevicePerDay}`,
    );
    console.log(
      `  - Total: ${DEVICES.length} × ${numDays} × ${measurementsPerDevicePerDay} = ${measurements.length}`,
    );
    console.log();
    console.log('Device list:');
    DEVICES.forEach((device) => {
      console.log(`  - ${device.code}: ${device.name}`);
    });
  } catch (error) {
    console.error('✗ Error seeding measurements:', error);
    throw error;
  }
}

/**
 * Main function to run seed
 */
async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'brick_counter',
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');
    console.log();
    console.log('Seeding brick counter measurements...');
    console.log();

    await seedMeasurements(dataSource);

    await dataSource.destroy();
    console.log();
    console.log('✓ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Seed failed:', error);
    process.exit(1);
  }
}

main();
