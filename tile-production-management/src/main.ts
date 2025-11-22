import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import type { DeviceExtraInfo } from './common/mqtt/device-extra-info';
import { ValidationPipe } from '@nestjs/common';
import { Measurement } from 'src/measurement/entities/measurement.entity';
import { MeasurementType } from 'src/measurement-types/entities/measurement-types.entity';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';

// Dữ liệu thiết bị mẫu cho PX-01, 1 dây chuyền
const DEVICES_DATA = [
    {
        name: 'Sau máy ép 1',
        deviceId: 'SAU-ME-01',
        type: 'counter',
        serial_number: 'SAU-ME-01-2024',
        position: 'Sau máy ép',
        description: 'Máy đếm gạch tại vị trí sau máy ép 1',
    },
    {
        name: 'Sau máy ép 2',
        deviceId: 'SAU-ME-02',
        type: 'counter',
        serial_number: 'SAU-ME-02-2024',
        position: 'Sau máy ép',
        description: 'Máy đếm gạch tại vị trí sau máy ép 2',
    },
    {
        name: 'Trước lò nung 1',
        deviceId: 'TRUOC-LN-01',
        type: 'counter',
        serial_number: 'TRUOC-LN-01-2024',
        position: 'Trước lò nung',
        description: 'Máy đếm gạch tại vị trí trước lò nung 1',
    },
    {
        name: 'Trước lò nung 2',
        deviceId: 'TRUOC-LN-02',
        type: 'counter',
        serial_number: 'TRUOC-LN-02-2024',
        position: 'Trước lò nung',
        description: 'Máy đếm gạch tại vị trí trước lò nung 2',
    },
    {
        name: 'Sau lò nung 1',
        deviceId: 'SAU-LN-01',
        type: 'counter',
        serial_number: 'SAU-LN-01-2024',
        position: 'Sau lò nung',
        description: 'Máy đếm gạch tại vị trí sau lò nung 1',
    },
    {
        name: 'Trước mài mặt 1',
        deviceId: 'TRUOC-MM-01',
        type: 'counter',
        serial_number: 'TRUOC-MM-01-2024',
        position: 'Trước mài mặt',
        description: 'Máy đếm gạch tại vị trí trước mài mặt 1',
    },
    {
        name: 'Sau mài cạnh 1',
        deviceId: 'SAU-MC-01',
        type: 'counter',
        serial_number: 'SAU-MC-01-2024',
        position: 'Sau mài cạnh',
        description: 'Máy đếm gạch tại vị trí sau mài cạnh 1',
    },
    {
        name: 'Trước đóng hộp 1',
        deviceId: 'TRUOC-DH-01',
        type: 'counter',
        serial_number: 'TRUOC-DH-01-2024',
        position: 'Trước đóng hộp',
        description: 'Máy đếm gạch tại vị trí trước đóng hộp 1',
    },
];

// Các loại gạch cơ bản (seed cho bảng brick_types)
const baseProduct = {
    brickTypes: [
        {
            name: '300x600mm',
            description: 'Gạch ốp lát 300x600mm',
            unit: 'm2',
            specs: {
                width: 300,
                height: 600,
                thickness: 10,
            },
        },
        {
            name: '400x800mm',
            description: 'Gạch ốp lát 400x800mm',
            unit: 'm2',
            specs: {
                width: 400,
                height: 800,
                thickness: 10,
            },
        },
        {
            name: '600x600mm',
            description: 'Gạch ốp lát 600x600mm',
            unit: 'm2',
            specs: {
                width: 600,
                height: 600,
                thickness: 10,
            },
        },
    ],
};

async function seedBrickTypes(dataSource: DataSource) {
    console.log('🔁 Seeding base brick types...');
    for (const bt of baseProduct.brickTypes) {
        const existing = await dataSource.query(
            `SELECT id FROM brick_types WHERE name = $1 LIMIT 1`,
            [bt.name],
        );
        if (existing && existing.length > 0) {
            continue;
        }
        await dataSource.query(
            `INSERT INTO brick_types (name, description, unit, specs, "isActive") 
             VALUES ($1, $2, $3, $4, false)`,
            [bt.name, bt.description, bt.unit, JSON.stringify(bt.specs)],
        );
    }
}

async function seedMeasurementTypes(dataSource: DataSource): Promise<number> {
    console.log('🔁 Seeding measurement types...');
    const code = 'BRICK_COUNTER';

    const existing = await dataSource.query(
        `SELECT id FROM measurement_types WHERE code = $1 LIMIT 1`,
        [code],
    );

    if (existing && existing.length > 0) {
        return existing[0].id as number;
    }

    const schema = {
        type: 'object',
        properties: {
            ts: { type: 'string', format: 'date-time' },
            metrics: {
                type: 'object',
                properties: {
                    count: { type: 'number' },
                    err_count: { type: 'number' },
                },
                required: ['count'],
                additionalProperties: true,
            },
            quality: {
                type: 'object',
                properties: {
                    rssi: { type: 'number' },
                },
                additionalProperties: true,
            },
        },
        required: ['metrics'],
        additionalProperties: true,
    };

    const result = await dataSource.query(
        `INSERT INTO measurement_types (code, name, data_schema, data_schema_version, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
            code,
            'Đếm gạch (counter)',
            JSON.stringify(schema),
            1,
            'Schema cho thiết bị đếm gạch BRICK_COUNTER',
        ],
    );

    const id = result[0].id as number;
    console.log(`✅ Created measurement_type BRICK_COUNTER (ID: ${id})`);
    return id;
}

async function seedDeviceCluster(
    dataSource: DataSource,
    measurementTypeId: number,
    productionLineId?: number,
): Promise<number> {
    console.log('🔁 Seeding device cluster...');
    const code = 'BRICK_COUNTER';

    const existing = await dataSource.query(
        `SELECT id FROM devices_cluster WHERE code = $1 LIMIT 1`,
        [code],
    );

    if (existing && existing.length > 0) {
        return existing[0].id as number;
    }

    const clusterConfig = {
        qosDefault: 1,
        interval_message_time: 60,
        telemetry: {
            topic: '/devices/{deviceId}/telemetry',
            qos: 1,
        },
        commands: [
            {
                code: 'reset',
                name: 'Reset thiết bị',
                topic: '/devices/{deviceId}/commands/reset',
                payloadTemplate: { action: 'reset' },
            },
            {
                code: 'reset_counter',
                name: 'Reset counter',
                topic: '/devices/{deviceId}/commands/reset_counter',
                payloadTemplate: { action: 'reset_counter' },
            },
        ],
        other: {
            note: 'Cụm mặc định cho thiết bị đếm gạch',
        },
    };

    const result = await dataSource.query(
        `INSERT INTO devices_cluster (name, code, description, config, measurement_type_id, "production_line_id")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
            'Cụm Brick Counter',
            code,
            'Cụm cấu hình mặc định cho thiết bị đếm gạch',
            JSON.stringify(clusterConfig),
            measurementTypeId,
            productionLineId ?? null,
        ],
    );

    const id = result[0].id as number;
    console.log(`✅ Created device_cluster BRICK_COUNTER (ID: ${id})`);
    return id;
}

async function seedDevices(dataSource: DataSource) {
    console.log('🔁 Auto-seeding devices for PX-01, DC-01...\n');
    try {
        await seedBrickTypes(dataSource);

        // 1. Tìm hoặc tạo Workshop PX-01
        const workshopName = 'Phân xưởng 1';
        let workshop = await dataSource.query(
            `SELECT id, name FROM workshops WHERE name = $1 LIMIT 1`,
            [workshopName],
        );

        let workshopId: number;
        if (!workshop || workshop.length === 0) {
            console.log('➕ Creating Workshop PX-01...');
            const result = await dataSource.query(
                `INSERT INTO workshops (name, location) VALUES ($1, $2) RETURNING id, name`,
                [workshopName, 'Nhà máy chính'],
            );
            workshopId = result[0].id;
            console.log(`✅ Created Workshop: ${result[0].name} (ID: ${workshopId})\n`);
        } else {
            workshopId = workshop[0].id;
            console.log(`✅ Found Workshop: ${workshop[0].name} (ID: ${workshopId})\n`);
        }

        // 2. Tìm hoặc tạo 2 dây chuyền cho PX-01
        const lineNames = ['Dây chuyền 1', 'Dây chuyền 2'];
        const lineIds: number[] = [];

        for (const lineName of lineNames) {
            const existing = await dataSource.query(
                `SELECT id FROM production_lines WHERE name = $1 AND "workshopId" = $2 LIMIT 1`,
                [lineName, workshopId],
            );

            if (existing && existing.length > 0) {
                lineIds.push(existing[0].id);
                console.log(`✅ Found production line: ${lineName} (ID: ${existing[0].id})`);
            } else {
                const result = await dataSource.query(
                    `INSERT INTO production_lines (name, "workshopId", status) 
                     VALUES ($1, $2, 'active') RETURNING id`,
                    [lineName, workshopId],
                );
                lineIds.push(result[0].id);
                console.log(`➕ Created production line: ${lineName} (ID: ${result[0].id})`);
            }
        }

        // 3. Seed measurement_type + device_cluster (gắn với dây chuyền đầu tiên)
        const measurementTypeId = await seedMeasurementTypes(dataSource);
        const clusterId = await seedDeviceCluster(dataSource, measurementTypeId, lineIds[0]);

        // 4. Seed vị trí + thiết bị cho từng dây chuyền
        for (const productionLineId of lineIds) {
            console.log(`➡️  Seeding devices for production line #${productionLineId}...`);
            let positionIndex = 1;

            for (const deviceData of DEVICES_DATA) {
                // Kiểm tra device đã tồn tại chưa
                const existingDevice = await dataSource.query(
                    `SELECT id FROM devices WHERE "deviceId" = $1 LIMIT 1`,
                    [deviceData.deviceId],
                );

                if (existingDevice && existingDevice.length > 0) {
                    console.log(`   • Device already exists: ${deviceData.deviceId}`);
                    continue;
                }

                console.log(`   → Processing: ${deviceData.name} (${deviceData.deviceId})`);

                // Kiểm tra position đã tồn tại chưa
                let position = await dataSource.query(
                    `SELECT id FROM positions WHERE name = $1 AND "productionLineId" = $2 LIMIT 1`,
                    [deviceData.position, productionLineId],
                );

                let positionId: number;

                if (!position || position.length === 0) {
                    // Tạo position mới
                    const result = await dataSource.query(
                        `INSERT INTO positions (name, description, "productionLineId", index) 
                         VALUES ($1, $2, $3, $4) RETURNING id`,
                        [
                            deviceData.position,
                            deviceData.description || `Vị trí ${deviceData.position}`,
                            productionLineId,
                            positionIndex++,
                        ],
                    );
                    positionId = result[0].id;
                    console.log(
                        `      ✓ Created position: ${deviceData.position} (ID: ${positionId})`,
                    );
                } else {
                    positionId = position[0].id;
                }

                const extraInfo: DeviceExtraInfo = {
                    interval_message_time: 60,
                    telemetry: {
                        topic: `devices/${deviceData.deviceId}/telemetry`,
                        qos: 1,
                    },
                };

                await dataSource.query(
                    `INSERT INTO devices ("deviceId", name, type, serial_number, status, "positionId", installation_date, "extraInfo", "cluster_id") 
                     VALUES ($1, $2, $3, $4, 'online', $5, CURRENT_DATE, $6, $7)`,
                    [
                        deviceData.deviceId,
                        deviceData.name,
                        deviceData.type,
                        deviceData.serial_number,
                        positionId,
                        JSON.stringify(extraInfo),
                        clusterId,
                    ],
                );

                console.log(`      ✓ Created device: ${deviceData.deviceId}`);
            }

            console.log('');
        }

        console.log('\n✅ Device seeding completed!\n');
    } catch (error) {
        console.error('❌ Error during auto-seeding:', error);
    }
}

// -----------------------------------------------
// Data generator
// -----------------------------------------------
function generateMeasurementData(
  deviceCode: string,
  count: number,
  errorCount: number = 0,
) {
  return {
    ts: new Date().toISOString(),
    deviceId: deviceCode,
    schemaVer: 1,
    metrics: {
      count,
      error_count: errorCount,
    },
    quality: {
      rssi: Math.floor(Math.random() * 60) - 90,
    },
  };
}

// -----------------------------------------------
// Seed logic
// -----------------------------------------------
async function seedMeasurements(dataSource: DataSource) {
  const measurementRepo = dataSource.getRepository(Measurement);
  const measurementTypeRepo = dataSource.getRepository(MeasurementType);

  // Measurement Type
  let measurementType = await measurementTypeRepo.findOne({
    where: { code: 'BRICK_COUNTER' },
  });

  if (!measurementType) {
    measurementType = measurementTypeRepo.create({
      code: 'BRICK_COUNTER',
      name: 'Đếm gạch',
      data_schema: {
        count: 'number',
        error_count: 'number',
      },
      data_schema_version: 1,
      description: 'Counter sensor for brick production',
    });

    await measurementTypeRepo.save(measurementType);
    console.log('✓ Created MeasurementType: COUNT_BRICK');
  }

  // Generate data
  const measurements: Measurement[] = [];
  const numDays = 7;
  const perDay = 10;

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - numDays);
  const devices = await dataSource.query(
    `SELECT id, "deviceId" as code, cluster_id FROM devices WHERE "cluster_id" IS NOT NULL AND type = 'counter'`,
  );
  for (const dev of devices) {
    let currentCount = Math.floor(Math.random() * 400) + 100;

    for (let d = 0; d < numDays; d++) {
      const day = new Date(baseDate);
      day.setDate(day.getDate() + d);

      for (let i = 0; i < perDay; i++) {
        const h = Math.floor(Math.random() * 24);
        const m = Math.floor(Math.random() * 60);
        const s = Math.floor(Math.random() * 60);

        const ts = new Date(day);
        ts.setHours(h, m, s);

        const random = Math.random();
        if (random < 0.7) currentCount += Math.floor(Math.random() * 16) + 5;
        else if (random < 0.9) currentCount += Math.floor(Math.random() * 151) + 50;
        else currentCount = Math.floor(Math.random() * 50);

        const errorCount = Math.random() < 0.3 ? Math.floor(Math.random() * 5) : 0;

        const measurement = measurementRepo.create({
          device_id: dev.id,
          cluster_id: dev.cluster_id,
          type_id: measurementType.id,
          timestamp: ts,
          ingest_time: new Date(),
          data: generateMeasurementData(dev.code, currentCount, errorCount),
        });

        measurements.push(measurement);
      }
    }
  }

  await measurementRepo.save(measurements, { chunk: 100 });

  console.log(`✓ Inserted ${measurements.length} measurement rows`);
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

    // App use CookieParser
    app.use(cookieParser());

    // Auto-seed devices on startup
    const dataSource = app.get(DataSource);
    await seedDevices(dataSource);
    await seedMeasurements(dataSource);
    // Validator Request Body Pipe 
    // app.useGlobalPipes(new ValidationPipe({
    //     whitelist: true,
    //     forbidNonWhitelisted: true,
    //     transform: true,
    // }));
    await app.listen(process.env.PORT ?? 5555);
}
bootstrap();

