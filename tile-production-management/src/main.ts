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

// Cac loai gach co ban dung cho seed
const baseProduct = {
    brickTypes: [
        {
            name: '300x600mm',
            description: 'Gach op lat 300x600mm',
            unit: 'm2',
            specs: {
                width: 300,
                height: 600,
                thickness: 10,
            },
        },
        {
            name: '400x800mm',
            description: 'Gach op lat 400x800mm',
            unit: 'm2',
            specs: {
                width: 400,
                height: 800,
                thickness: 10,
            },
        },
        {
            name: '600x600mm',
            description: 'Gach op lat 600x600mm',
            unit: 'm2',
            specs: {
                width: 600,
                height: 600,
                thickness: 10,
            },
        },
    ],
};
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

        // DELETE FROM THIS IN PRODUCT TO ...
        let workshopId2;
        if (!workshop || workshop.length === 0) {
            console.log('📝 Creating Workshop PX-01...');
            const result = await dataSource.query(
                `INSERT INTO workshops (name, location) VALUES ('Phân xưởng 2', 'Nhà máy phụ') RETURNING id, name`
            );
            workshopId2 = result[0].id;
            console.log(`✅ Created Workshop: ${result[0].name} (ID: ${workshopId})\n`);

        } else {
            workshopId2 = workshop[0].id;
            console.log(`✅ Found Workshop: ${workshop[0].name} (ID: ${workshopId})\n`);
        }
        // DELELE END!

        // 1.5 Seed cac BrickType co ban
        for (const bt of baseProduct.brickTypes) {
            await dataSource.query(
                `INSERT INTO brick_types (name, description, unit, specs)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO NOTHING`,
                [bt.name, bt.description, bt.unit, bt.specs],
            );
        }

        const defaultBrick = baseProduct.brickTypes[0];
        const brickRows = await dataSource.query(
            `SELECT id FROM brick_types WHERE name = $1 LIMIT 1`,
            [defaultBrick.name],
        );
        const brickTypeId: number | undefined = brickRows[0]?.id;

        // 2. Tim hoac tao Production Line DC-01
        const existingLines = await dataSource.query(
            `SELECT id, name FROM production_lines
       WHERE (name ILIKE $1 OR name ILIKE $2 OR name ILIKE $3)
         AND "workshopId" = $4
       LIMIT 1`,
            ['%Day chuyen 1%', '%DC-01%', '%DC01%', workshopId],
        );

        let productionLineId: number;
        if (!existingLines || existingLines.length === 0) {
            console.log('Creating Production Line DC-01...');
            const result = await dataSource.query(
                `INSERT INTO production_lines (name, description, capacity, "workshopId", "activeBrickTypeId")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name`,
                [
                    'Dây chuyền 1',
                    'Dây chuyền sản xuất số 1',
                    10000,
                    workshopId,
                    brickTypeId ?? null,
                ],
            );


            productionLineId = result[0].id;
            console.log(
                `Created Production Line: ${result[0].name} (ID: ${productionLineId})\n`,
            );
        } else {
            productionLineId = existingLines[0].id;
            console.log(
                `Found Production Line: ${existingLines[0].name} (ID: ${productionLineId})\n`,
            );

            if (brickTypeId) {
                await dataSource.query(
                    `UPDATE production_lines
           SET "activeBrickTypeId" = $1
           WHERE id = $2 AND "activeBrickTypeId" IS NULL`,
                    [brickTypeId, productionLineId],
                );
            }
        }

        // DELETE FROM THIS IN PRODUCT TO ...
        let productionLineId2
        const productionLineId2Res = await dataSource.query(
            `INSERT INTO production_lines (name, description, capacity, "workshopId", "activeBrickTypeId")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name`,
            [
                'Dây chuyền 1',
                'Dây chuyền sản xuất số 1',
                10000,
                workshopId,
                brickTypeId ?? null,
            ],
        );


        productionLineId2 = productionLineId2Res[0].id;
        console.log(
            `Created Production Line: ${productionLineId2Res[0].name} (ID: ${productionLineId2})\n`,
        );
        await dataSource.query(
            `INSERT INTO production_lines (name, description, capacity, "workshopId", "activeBrickTypeId")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name`,
            [
                'Dây chuyền 1',
                'Dây chuyền sản xuất số 1 nhà máy 2',
                10000,
                workshopId,
                brickTypeId ?? null,
            ],
        );
        // DELELE END!


        // 3. Tạo Positions và Devices
        console.log('📦 Creating positions and devices...\n');

        let position_index = 1
        // // UNCOMMENT FROM HERE IN PRODUCT...
        // for (const deviceData of DEVICES_DATA) {
        //     // Kiểm tra device đã tồn tại chưa
        //     const existingDevice = await dataSource.query(
        //         `SELECT id FROM devices WHERE "deviceId" = $1 LIMIT 1`,
        //         [deviceData.deviceId]
        //     );

        //     if (existingDevice && existingDevice.length > 0) {
        //         console.log(`   ✓ Device already exists: ${deviceData.deviceId}`);
        //         continue;
        //     }

        //     console.log(`   Processing: ${deviceData.name} (${deviceData.deviceId})`);

        //     // Kiểm tra position đã tồn tại chưa
        //     let position = await dataSource.query(
        //         `SELECT id FROM positions WHERE name = $1 AND "productionLineId" = $2 LIMIT 1`,
        //         [deviceData.position, productionLineId]
        //     );

        //     let positionId;

        //     if (!position || position.length === 0) {
        //         // Tạo position mới
        //         const result = await dataSource.query(
        //             `INSERT INTO positions (name, description, "productionLineId", index) 
        //    VALUES ($1, $2, $3, $4) RETURNING id`,
        //             [deviceData.position, `Vị trí ${deviceData.position}`, productionLineId, position_index++]
        //         );
        //         positionId = result[0].id;
        //         console.log(`      ✓ Created position: ${deviceData.position} (ID: ${positionId})`);
        //     } else {
        //         positionId = position[0].id;
        //     }
        //     const extraInfo: DeviceExtraInfo = {
        //         interval_message_time: 60,
        //         sub_topic: `devices/${deviceData.deviceId}/telemetry`,
        //         qosDefault: 1,
        //     }
        //     // Tạo device mới
        //     await dataSource.query(
        //         `INSERT INTO devices ("deviceId", name, type, serial_number, status, "positionId", installation_date, "extraInfo") 
        //  VALUES ($1, $2, $3, $4, 'online', $5, CURRENT_DATE, $6)`,
        //         [deviceData.deviceId, deviceData.name, deviceData.type, deviceData.serial_number, positionId, JSON.stringify(extraInfo)]
        //     );

        //     console.log(`      ✓ Created device: ${deviceData.deviceId}`);
        // }
        // // END UNCOMMENT!

        // DELETE FROM HERE IN PRODUCT...
        for (let prline = 1; prline < 3; prline++) {
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
                        `INSERT INTO positions (name, description, "productionLineId", index) 
           VALUES ($1, $2, $3, $4) RETURNING id`,
                        [deviceData.position, `Vị trí ${deviceData.position}`, prline, position_index++]
                    );
                    positionId = result[0].id;
                    console.log(`      ✓ Created position: ${deviceData.position} (ID: ${positionId})`);
                } else {
                    positionId = position[0].id;
                }
                const extraInfo: DeviceExtraInfo = {
                    interval_message_time: 60,
                    sub_topic: `devices/${deviceData.deviceId}/telemetry`,
                    qosDefault: 1,
                }
                // Tạo device mới
                await dataSource.query(
                    `INSERT INTO devices ("deviceId", name, type, serial_number, status, "positionId", installation_date, "extraInfo") 
         VALUES ($1, $2, $3, $4, 'online', $5, CURRENT_DATE, $6)`,
                    [deviceData.deviceId, deviceData.name, deviceData.type, deviceData.serial_number, positionId, JSON.stringify(extraInfo)]
                );

                console.log(`      ✓ Created device: ${deviceData.deviceId}`);
            }
        }
        // END DELETE!


        console.log('\n✅ Device seeding completed!\n');
    } catch (error) {
        console.error('❌ Error during auto-seeding:', error);
    }
}

import cookieParser from 'cookie-parser'
import { DeviceExtraInfo } from './devices/entities/device.entity';
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
    app.use(cookieParser())

    // Auto-seed devices on startup
    const dataSource = app.get(DataSource);
    await seedDevices(dataSource);

    await app.listen(process.env.PORT ?? 5555);
}
bootstrap();