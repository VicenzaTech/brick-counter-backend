import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { ProductionLine } from './production-lines/entities/production-line.entity';
import { ProductionStage } from './production-stages/entities/production-stage.entity';
import { Position } from './positions/entities/position.entity';
import cookieParser from 'cookie-parser';
import type { DeviceExtraInfo } from './common/mqtt/device-extra-info';
import { ValidationPipe } from '@nestjs/common';
import { Measurement } from 'src/measurement/entities/measurement.entity';
import { MeasurementType } from 'src/measurement-types/entities/measurement-types.entity';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const newBrickTypes = {
  "brickTypes": [
    {
      "name": "300x600mm Porcelain mài bóng",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 1",
      "tileSize": "300x600mm",
      "contractCycle": 50,
      "kilnOutput": 10037,
      "qualityProductOutput": 9590,
      "deductionDays": 1.5,
      "contractProduction": 273300,
      "additionalContractWhenReducingCycle": 282900,
      "reducedContractWhenIncreasingCycle": -147,
      "unit": "m2",
      "specs": {
        "width": 300,
        "height": 600,
        "type": "Porcelain",
        "finish": "mài bóng"
      }
    },
    {
      "name": "300x600mm Granite dày 12mm",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 1",
      "tileSize": "300x600mm",
      "contractCycle": 52,
      "kilnOutput": 9665,
      "qualityProductOutput": 9230,
      "deductionDays": 1.5,
      "contractProduction": 263100,
      "additionalContractWhenReducingCycle": 272300,
      "reducedContractWhenIncreasingCycle": -136,
      "unit": "m2",
      "specs": {
        "width": 300,
        "height": 600,
        "type": "Granite",
        "thickness": 12
      }
    },
    {
      "name": "400x800mm Granite mài bóng",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 1",
      "tileSize": "400x800mm",
      "contractCycle": 48,
      "kilnOutput": 11792,
      "qualityProductOutput": 11260,
      "deductionDays": 1.5,
      "contractProduction": 320900,
      "additionalContractWhenReducingCycle": 332200,
      "reducedContractWhenIncreasingCycle": -180,
      "unit": "m2",
      "specs": {
        "width": 400,
        "height": 800,
        "type": "Granite",
        "finish": "mài bóng"
      }
    },
    {
      "name": "400x800mm Granite dày 12mm",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 1",
      "tileSize": "400x800mm",
      "contractCycle": 50,
      "kilnOutput": 11321,
      "qualityProductOutput": 10810,
      "deductionDays": 1.5,
      "contractProduction": 308100,
      "additionalContractWhenReducingCycle": 318900,
      "reducedContractWhenIncreasingCycle": -165,
      "unit": "m2",
      "specs": {
        "width": 400,
        "height": 800,
        "type": "Granite",
        "thickness": 12
      }
    },
    {
      "name": "400x600mm Granite dày",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 1",
      "tileSize": "400x600mm",
      "contractCycle": 50,
      "kilnOutput": 11454,
      "qualityProductOutput": 11000,
      "deductionDays": 1.5,
      "contractProduction": 313500,
      "additionalContractWhenReducingCycle": 324500,
      "reducedContractWhenIncreasingCycle": -168,
      "unit": "m2",
      "specs": {
        "width": 400,
        "height": 600,
        "type": "Granite"
      }
    },
    {
      "name": "800x800mm Porcelain",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 1",
      "tileSize": "800x800mm",
      "contractCycle": 44,
      "kilnOutput": 13122,
      "qualityProductOutput": 12600,
      "deductionDays": 1.5,
      "contractProduction": 359100,
      "additionalContractWhenReducingCycle": 371700,
      "reducedContractWhenIncreasingCycle": -220,
      "unit": "m2",
      "specs": {
        "width": 800,
        "height": 800,
        "type": "Porcelain"
      }
    },
    {
      "name": "600x600mm Porcelain",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 1",
      "tileSize": "600x600mm",
      "contractCycle": 44,
      "kilnOutput": 12997,
      "qualityProductOutput": 12480,
      "deductionDays": 1.5,
      "contractProduction": 355700,
      "additionalContractWhenReducingCycle": 368200,
      "reducedContractWhenIncreasingCycle": -218,
      "unit": "m2",
      "specs": {
        "width": 600,
        "height": 600,
        "type": "Porcelain"
      }
    },
    {
      "name": "600x600mm Semi men bóng",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 1",
      "tileSize": "600x600mm",
      "contractCycle": 43,
      "kilnOutput": 13299,
      "qualityProductOutput": 12770,
      "deductionDays": 1.5,
      "contractProduction": 363900,
      "additionalContractWhenReducingCycle": 376700,
      "reducedContractWhenIncreasingCycle": -228,
      "unit": "m2",
      "specs": {
        "width": 600,
        "height": 600,
        "type": "Semi men bóng"
      }
    },
    {
      "name": "600x600mm Porcelain",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 2",
      "tileSize": "600x600mm",
      "contractCycle": 42,
      "kilnOutput": 15953,
      "qualityProductOutput": 15310,
      "deductionDays": 1.5,
      "contractProduction": 436300,
      "additionalContractWhenReducingCycle": 451600,
      "reducedContractWhenIncreasingCycle": -280,
      "unit": "m2",
      "specs": {
        "width": 600,
        "height": 600,
        "type": "Porcelain"
      }
    },
    {
      "name": "600x600mm Semi men bóng",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 2",
      "tileSize": "600x600mm",
      "contractCycle": 41,
      "kilnOutput": 16342,
      "qualityProductOutput": 15690,
      "deductionDays": 1.5,
      "contractProduction": 447200,
      "additionalContractWhenReducingCycle": 462900,
      "reducedContractWhenIncreasingCycle": -294,
      "unit": "m2",
      "specs": {
        "width": 600,
        "height": 600,
        "type": "Semi men bóng"
      }
    },
    {
      "name": "800x800mm Porcelain",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 2",
      "tileSize": "800x800mm",
      "contractCycle": 47,
      "kilnOutput": 14335,
      "qualityProductOutput": 13760,
      "deductionDays": 1.5,
      "contractProduction": 392200,
      "additionalContractWhenReducingCycle": 405900,
      "reducedContractWhenIncreasingCycle": -224,
      "unit": "m2",
      "specs": {
        "width": 800,
        "height": 800,
        "type": "Porcelain"
      }
    },
    {
      "name": "600x600mm Granite dày 12mm",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 2",
      "tileSize": "600x600mm",
      "contractCycle": 45,
      "kilnOutput": 14889,
      "qualityProductOutput": 14290,
      "deductionDays": 1.5,
      "contractProduction": 407300,
      "additionalContractWhenReducingCycle": 421600,
      "reducedContractWhenIncreasingCycle": -244,
      "unit": "m2",
      "specs": {
        "width": 600,
        "height": 600,
        "type": "Granite",
        "thickness": 12
      }
    },
    {
      "name": "500x500mm Semi-Porcelain",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 2",
      "tileSize": "500x500mm",
      "contractCycle": 43,
      "kilnOutput": 16857,
      "qualityProductOutput": 16180,
      "deductionDays": 1.5,
      "contractProduction": 461100,
      "additionalContractWhenReducingCycle": 477300,
      "reducedContractWhenIncreasingCycle": -289,
      "unit": "m2",
      "specs": {
        "width": 500,
        "height": 500,
        "type": "Semi-Porcelain"
      }
    },
    {
      "name": "500x500mm Granite dày 12mm",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 2",
      "tileSize": "500x500mm",
      "contractCycle": 46,
      "kilnOutput": 15363,
      "qualityProductOutput": 14750,
      "deductionDays": 1.5,
      "contractProduction": 420400,
      "additionalContractWhenReducingCycle": 435100,
      "reducedContractWhenIncreasingCycle": -246,
      "unit": "m2",
      "specs": {
        "width": 500,
        "height": 500,
        "type": "Granite",
        "thickness": 12
      }
    },
    {
      "name": "500x500mm Granite dày 9,5mm",
      "workshop": "Phân xưởng 1",
      "productionLine": "Dây chuyền 2",
      "tileSize": "500x500mm",
      "contractCycle": 43,
      "kilnOutput": 16434,
      "qualityProductOutput": 15780,
      "deductionDays": 1.5,
      "contractProduction": 449700,
      "additionalContractWhenReducingCycle": 465500,
      "reducedContractWhenIncreasingCycle": -282,
      "unit": "m2",
      "specs": {
        "width": 500,
        "height": 500,
        "type": "Granite",
        "thickness": 9.5
      }
    },
    {
      "name": "800x800mm Porcelain",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 5",
      "tileSize": "800x800mm",
      "contractCycle": 44,
      "kilnOutput": 19535,
      "qualityProductOutput": 18660,
      "deductionDays": 1.5,
      "contractProduction": 531800,
      "additionalContractWhenReducingCycle": 550500,
      "reducedContractWhenIncreasingCycle": -325,
      "unit": "m2",
      "specs": {
        "width": 800,
        "height": 800,
        "type": "Porcelain"
      }
    },
    {
      "name": "600x600mm Porcelain",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 5",
      "tileSize": "600x600mm",
      "contractCycle": 47,
      "kilnOutput": 18072,
      "qualityProductOutput": 17260,
      "deductionDays": 1.5,
      "contractProduction": 491900,
      "additionalContractWhenReducingCycle": 509200,
      "reducedContractWhenIncreasingCycle": -281,
      "unit": "m2",
      "specs": {
        "width": 600,
        "height": 600,
        "type": "Porcelain"
      }
    },
    {
      "name": "150x800mm Porcelain",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 5",
      "tileSize": "150x800mm",
      "contractCycle": 58,
      "kilnOutput": 16841,
      "qualityProductOutput": 16080,
      "deductionDays": 1.5,
      "contractProduction": 458300,
      "additionalContractWhenReducingCycle": 474400,
      "reducedContractWhenIncreasingCycle": -212,
      "unit": "m2",
      "specs": {
        "width": 150,
        "height": 800,
        "type": "Porcelain"
      }
    },
    {
      "name": "1000x1000mm Granite",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 5",
      "tileSize": "1000x1000mm",
      "contractCycle": 63,
      "kilnOutput": 11161,
      "qualityProductOutput": 10660,
      "deductionDays": 1.5,
      "contractProduction": 303800,
      "additionalContractWhenReducingCycle": 314500,
      "reducedContractWhenIncreasingCycle": -129,
      "unit": "m2",
      "specs": {
        "width": 1000,
        "height": 1000,
        "type": "Granite"
      }
    },
    {
      "name": "600x1200mm Granite",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 5",
      "tileSize": "600x1200mm",
      "contractCycle": 60,
      "kilnOutput": 13875,
      "qualityProductOutput": 13250,
      "deductionDays": 1.5,
      "contractProduction": 377600,
      "additionalContractWhenReducingCycle": 390900,
      "reducedContractWhenIncreasingCycle": -168,
      "unit": "m2",
      "specs": {
        "width": 600,
        "height": 1200,
        "type": "Granite"
      }
    },
    {
      "name": "500x500mm Ceramic Bóng",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 6",
      "tileSize": "500x500mm",
      "contractCycle": 32,
      "kilnOutput": 11046,
      "qualityProductOutput": 10660,
      "deductionDays": 1.5,
      "contractProduction": 303800,
      "additionalContractWhenReducingCycle": 314500,
      "reducedContractWhenIncreasingCycle": -258,
      "unit": "m2",
      "specs": {
        "width": 500,
        "height": 500,
        "type": "Ceramic",
        "finish": "Bóng"
      }
    },
    {
      "name": "500x500mm Ceramic Sân vườn",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 6",
      "tileSize": "500x500mm",
      "contractCycle": 32,
      "kilnOutput": 11046,
      "qualityProductOutput": 10660,
      "deductionDays": 1.5,
      "contractProduction": 303800,
      "additionalContractWhenReducingCycle": 314500,
      "reducedContractWhenIncreasingCycle": -258,
      "unit": "m2",
      "specs": {
        "width": 500,
        "height": 500,
        "type": "Ceramic",
        "finish": "Sân vườn"
      }
    },
    {
      "name": "500x500mm Kimsa dày 11,5mm",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 6",
      "tileSize": "500x500mm",
      "contractCycle": 47,
      "kilnOutput": 7185,
      "qualityProductOutput": 6900,
      "deductionDays": 1.5,
      "contractProduction": 196700,
      "additionalContractWhenReducingCycle": 203600,
      "reducedContractWhenIncreasingCycle": -112,
      "unit": "m2",
      "specs": {
        "width": 500,
        "height": 500,
        "type": "Kimsa",
        "thickness": 11.5
      }
    },
    {
      "name": "500x500mm Kimsa dày 9,5mm",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 6",
      "tileSize": "500x500mm",
      "contractCycle": 37,
      "kilnOutput": 9127,
      "qualityProductOutput": 8760,
      "deductionDays": 1.5,
      "contractProduction": 249700,
      "additionalContractWhenReducingCycle": 258400,
      "reducedContractWhenIncreasingCycle": -183,
      "unit": "m2",
      "specs": {
        "width": 500,
        "height": 500,
        "type": "Kimsa",
        "thickness": 9.5
      }
    },
    {
      "name": "500x500mm Kimsa Semi Suger",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 6",
      "tileSize": "500x500mm",
      "contractCycle": 37,
      "kilnOutput": 9378,
      "qualityProductOutput": 9000,
      "deductionDays": 1.5,
      "contractProduction": 256500,
      "additionalContractWhenReducingCycle": 265500,
      "reducedContractWhenIncreasingCycle": -188,
      "unit": "m2",
      "specs": {
        "width": 500,
        "height": 500,
        "type": "Kimsa Semi Suger"
      }
    },
    {
      "name": "400x600mm Kimsa dày 11,5mm",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 6",
      "tileSize": "400x600mm",
      "contractCycle": 48,
      "kilnOutput": 7056,
      "qualityProductOutput": 6770,
      "deductionDays": 1.5,
      "contractProduction": 192900,
      "additionalContractWhenReducingCycle": 199700,
      "reducedContractWhenIncreasingCycle": -108,
      "unit": "m2",
      "specs": {
        "width": 400,
        "height": 600,
        "type": "Kimsa",
        "thickness": 11.5
      }
    },
    {
      "name": "400x600mm Kimsa dày 9,5mm",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 6",
      "tileSize": "400x600mm",
      "contractCycle": 40,
      "kilnOutput": 8468,
      "qualityProductOutput": 8130,
      "deductionDays": 1.5,
      "contractProduction": 231700,
      "additionalContractWhenReducingCycle": 239800,
      "reducedContractWhenIncreasingCycle": -156,
      "unit": "m2",
      "specs": {
        "width": 400,
        "height": 600,
        "type": "Kimsa",
        "thickness": 9.5
      }
    },
    {
      "name": "400x400mm Kimsa Semi Matt",
      "workshop": "Phân xưởng 2",
      "productionLine": "Dây chuyền 6",
      "tileSize": "400x400mm",
      "contractCycle": 40,
      "kilnOutput": 8519,
      "qualityProductOutput": 8180,
      "deductionDays": 1.5,
      "contractProduction": 233100,
      "additionalContractWhenReducingCycle": 241300,
      "reducedContractWhenIncreasingCycle": -129,
      "unit": "m2",
      "specs": {
        "width": 400,
        "height": 400,
        "type": "Kimsa Semi Matt"
      }
    }
  ]
}
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

async function seedBrickTypesFromTable(dataSource: DataSource) {
  console.log('🔁 Seeding brick types from production table...');

  for (const brickType of newBrickTypes.brickTypes) {
    const existing = await dataSource.query(
      `SELECT id FROM brick_types WHERE name = $1 AND workshop = $2 AND "productionLine" = $3 LIMIT 1`,
      [brickType.name, brickType.workshop, brickType.productionLine]
    );

    if (existing && existing.length > 0) {
      console.log(`   • Brick type already exists: ${brickType.name} (${brickType.workshop} - ${brickType.productionLine})`);
      continue;
    }

    await dataSource.query(
      `INSERT INTO brick_types (
    name, description, unit, specs, "isActive", workshop, "productionLine", 
    "tileSize", "contractCycle", "kilnOutput", "qualityProductOutput", "deductionDays", 
    "contractProduction", "additionalContractWhenReducingCycle", "reducedContractWhenIncreasingCycle"
  ) VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        brickType.name,
        brickType.name,
        brickType.unit,
        JSON.stringify(brickType.specs),
        brickType.workshop,
        brickType.productionLine,
        brickType.tileSize,
        brickType.contractCycle,
        brickType.kilnOutput,
        brickType.qualityProductOutput,
        brickType.deductionDays,
        brickType.contractProduction,
        brickType.additionalContractWhenReducingCycle,
        brickType.reducedContractWhenIncreasingCycle
      ]
    );

    console.log(`   ✓ Created brick type: ${brickType.name} (${brickType.workshop} - ${brickType.productionLine})`);
  }

  console.log('✅ Brick types seeding completed!');
}

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
  const code = 'mdg';

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
      deviceId: { type: 'string' },
      metrics: {
        type: 'object',
        properties: {
          sensors: {
            type: 'object',
            additionalProperties: { type: 'number' },
          },
          total: { type: 'number' },
          error: {
            type: 'object',
            additionalProperties: true,
          },
        },
        required: ['sensors', 'total', 'error'],
        additionalProperties: false,
      },
      quality: {
        type: 'object',
        additionalProperties: true,
      },
    },
    required: ['ts', 'deviceId', 'metrics', 'quality'],
    additionalProperties: false,
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
      'Schema cho thiết bị đếm gạch mdg',
    ],
  );

  const id = result[0].id as number;
  console.log(`✅ Created measurement_type mdg (ID: ${id})`);
  return id;
}

async function seedDeviceCluster(
  dataSource: DataSource,
  measurementTypeId: number,
  productionLineId?: number,
): Promise<number> {
  console.log('🔁 Seeding device cluster...');
  const code = 'mdg';
  const clusterName = 'Cụm Brick Counter';

  // Check by both code and name to handle unique constraints
  const existing = await dataSource.query(
    `SELECT id FROM devices_cluster WHERE code = $1 OR name = $2 LIMIT 1`,
    [code, clusterName],
  );

  if (existing && existing.length > 0) {
    const clusterId = existing[0].id as number;
    console.log(`✅ Found existing device_cluster: ${clusterName} (ID: ${clusterId})`);

    // Update config if needed
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

    await dataSource.query(
      `UPDATE devices_cluster 
       SET config = $1, measurement_type_id = $2
       WHERE id = $3`,
      [JSON.stringify(clusterConfig), measurementTypeId, clusterId]
    );

    return clusterId;
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
      clusterName,
      code,
      'Cụm cấu hình mặc định cho thiết bị đếm gạch',
      JSON.stringify(clusterConfig),
      measurementTypeId,
      productionLineId ?? null,
    ],
  );

  const id = result[0].id as number;
  console.log(`✅ Created device_cluster: ${clusterName} (ID: ${id})`);
  return id;
}

async function seedDevices(dataSource: DataSource) {
  console.log('🔁 Seeding devices for production line 1...');

  try {
    // Get production line 1
    const productionLine = await dataSource.query(
      `SELECT id, name FROM production_lines WHERE name = $1 LIMIT 1`,
      ['Dây chuyền 1']
    );

    if (!productionLine || productionLine.length === 0) {
      console.warn('⚠️  Dây chuyền 1 not found. Please seed production lines first.');
      return;
    }

    const line = productionLine[0];
    console.log(`   • Processing production line: ${line.name} (ID: ${line.id})`);

    // Get device cluster (assuming it exists)
    const deviceCluster = await dataSource.query(
      `SELECT id FROM devices_cluster WHERE code = $1 LIMIT 1`,
      ['mdg']
    );

    if (!deviceCluster || deviceCluster.length === 0) {
      console.warn('⚠️  No device cluster found. Please seed device clusters first.');
      return;
    }
    const clusterId = deviceCluster[0].id;

    // Device configurations for Dây chuyền 1
    const deviceConfigs = [
      // 2 devices for "Sau máy ép"
      {
        name: 'Sau máy ép 1',
        deviceId: 'SAU-ME1-DC1-PX1',
        position: 'Sau máy ép',
        description: 'Máy đếm gạch tại vị trí sau máy ép 1',
      },
      {
        name: 'Sau máy ép 2',
        deviceId: 'SAU-ME2-DC1-PX1',
        position: 'Sau máy ép',
        description: 'Máy đếm gạch tại vị trí sau máy ép 2',
      },
      // 2 devices for "Trước lò nung"
      {
        name: 'Trước lò nung 1',
        deviceId: 'TRUOC-LN1-DC1-PX1',
        position: 'Trước lò nung',
        description: 'Máy đếm gạch tại vị trí trước lò nung 1',
      },
      {
        name: 'Trước lò nung 2',
        deviceId: 'TRUOC-LN2-DC1-PX1',
        position: 'Trước lò nung',
        description: 'Máy đếm gạch tại vị trí trước lò nung 2',
      },
      // Other positions with 1 device each
      {
        name: 'Sau lò nung 1',
        deviceId: 'SAU-LN-DC1-PX1',
        position: 'Sau lò nung',
        description: 'Máy đếm gạch tại vị trí sau lò nung 1',
      },
      {
        name: 'Trước mài 1',
        deviceId: 'TRUOC-M-DC1-PX1',
        position: 'Trước mài',
        description: 'Máy đếm gạch tại vị trí trước mài 1',
      },
      {
        name: 'Sau mài 1',
        deviceId: 'SAU-M-DC1-PX1',
        position: 'Sau mài',
        description: 'Máy đếm gạch tại vị trí sau mài 1',
      },
      {
        name: 'Trước đóng hộp 1',
        deviceId: 'TRUOC-DH-DC1-PX1',
        position: 'Trước đóng hộp',
        description: 'Máy đếm gạch tại vị trí trước đóng hộp 1',
      }
    ];

    for (const deviceConfig of deviceConfigs) {
      // Find position for this device
      const position = await dataSource.query(
        `SELECT id FROM positions 
         WHERE name = $1 AND "productionLineId" = $2 
         LIMIT 1`,
        [deviceConfig.position, line.id]
      );

      if (!position || position.length === 0) {
        console.warn(`   ⚠️  Position "${deviceConfig.position}" not found. Skipping device ${deviceConfig.deviceId}`);
        continue;
      }

      // Check if device already exists
      const existingDevice = await dataSource.query(
        `SELECT id FROM devices WHERE "deviceId" = $1 LIMIT 1`,
        [deviceConfig.deviceId]
      );

      if (existingDevice && existingDevice.length > 0) {
        console.log(`   • Device already exists: ${deviceConfig.deviceId}`);
        continue;
      }

      // Create the device
      await dataSource.query(
        `INSERT INTO devices (
          "deviceId", name, "positionId", 
          "cluster_id", status
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          deviceConfig.deviceId,
          deviceConfig.name,
          position[0].id,
          clusterId,
          'active',
        ]
      );

      console.log(`   ✓ Created device: ${deviceConfig.name} (${deviceConfig.deviceId}) at position: ${deviceConfig.position}`);
    }

    console.log('✅ Device seeding for production line 1 completed!');
  } catch (error) {
    console.error('❌ Error seeding devices:', error);
    throw error;
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
    where: { code: 'mdg' },
  });

  if (!measurementType) {
    measurementType = measurementTypeRepo.create({
      code: 'mdg',
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

async function seedWorkShopProductionLine(dataSource: DataSource) {
  console.log('🏭 Seeding workshops and production lines...');

  // 1. Create or find workshops
  const workshopName = 'Phân xưởng 1';
  let workshop = await dataSource.query(
    `SELECT id, name FROM workshops WHERE name = $1 LIMIT 1`,
    [workshopName],
  );

  let workshopId: number;
  if (!workshop || workshop.length === 0) {
    console.log(`➕ Creating Workshop ${workshopName}...`);
    const result = await dataSource.query(
      `INSERT INTO workshops (name, location) VALUES ($1, $2) RETURNING id, name`,
      [workshopName, 'Nhà máy chính'],
    );
    workshopId = result[0].id;
    console.log(`✅ Created Workshop: ${result[0].name} (ID: ${workshopId})`);
  } else {
    workshopId = workshop[0].id;
    console.log(`✅ Found Workshop: ${workshop[0].name} (ID: ${workshopId})`);
  }

  // 2. Create or find production lines
  const lineNames = ['Dây chuyền 1', 'Dây chuyền 2', 'Dây chuyền 5', 'Dây chuyền 6'];
  const lineIds: number[] = [];

  for (const lineName of lineNames) {
    const existing = await dataSource.query(
      `SELECT id FROM production_lines WHERE name = $1 AND "workshopId" = $2 LIMIT 1`,
      [lineName, workshopId],
    );

    if (existing && existing.length > 0) {
      lineIds.push(existing[0].id);
      console.log(`   • Found production line: ${lineName} (ID: ${existing[0].id})`);
    } else {
      const result = await dataSource.query(
        `INSERT INTO production_lines (name, "workshopId", status) 
         VALUES ($1, $2, 'active') RETURNING id`,
        [lineName, workshopId],
      );
      lineIds.push(result[0].id);
      console.log(`   • Created production line: ${lineName} (ID: ${result[0].id})`);
    }
  }

  return { workshopId, lineIds };
}

// ===============================
//        RBAC SEEDING
// ===============================
const PERMISSIONS = {
  // User
  USER_READ: 'user.read',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_DISABLE: 'user.disable',

  // Role
  ROLE_READ: 'role.read',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',

  // Workshop / production structure
  WORKSHOP_READ: 'workshop.read',
  WORKSHOP_CREATE: 'workshop.create',
  WORKSHOP_UPDATE: 'workshop.update',
  WORKSHOP_DELETE: 'workshop.delete',

  PRODUCTION_LINE_READ: 'production-line.read',
  PRODUCTION_LINE_CREATE: 'production-line.create',
  PRODUCTION_LINE_UPDATE: 'production-line.update',
  PRODUCTION_LINE_DELETE: 'production-line.delete',

  POSITION_READ: 'position.read',
  POSITION_CREATE: 'position.create',
  POSITION_UPDATE: 'position.update',
  POSITION_DELETE: 'position.delete',

  // Devices & telemetry
  DEVICE_READ: 'device.read',
  DEVICE_CREATE: 'device.create',
  DEVICE_UPDATE: 'device.update',
  DEVICE_DELETE: 'device.delete',

  // Production & brick types
  PRODUCTION_READ: 'production.read',
  PRODUCTION_CREATE: 'production.create',
  PRODUCTION_UPDATE: 'production.update',
  PRODUCTION_DELETE: 'production.delete',

  BRICK_TYPE_READ: 'brick-type.read',
  BRICK_TYPE_CREATE: 'brick-type.create',
  BRICK_TYPE_UPDATE: 'brick-type.update',
  BRICK_TYPE_DELETE: 'brick-type.delete',

  // Metrics & quotas
  PRODUCTION_METRIC_READ: 'production-metric.read',
  PRODUCTION_METRIC_CREATE: 'production-metric.create',
  PRODUCTION_METRIC_UPDATE: 'production-metric.update',
  PRODUCTION_METRIC_DELETE: 'production-metric.delete',

  QUOTA_TARGET_READ: 'quota-target.read',
  QUOTA_TARGET_CREATE: 'quota-target.create',
  QUOTA_TARGET_UPDATE: 'quota-target.update',
  QUOTA_TARGET_DELETE: 'quota-target.delete',

  // Maintenance
  MAINTENANCE_LOG_READ: 'maintenance-log.read',
  MAINTENANCE_LOG_CREATE: 'maintenance-log.create',
  MAINTENANCE_LOG_UPDATE: 'maintenance-log.update',
  MAINTENANCE_LOG_DELETE: 'maintenance-log.delete',
};

const PERMISSION_DEFINITIONS = [
  // User
  { code: PERMISSIONS.USER_READ, description: 'Read users' },
  { code: PERMISSIONS.USER_CREATE, description: 'Create users' },
  { code: PERMISSIONS.USER_UPDATE, description: 'Update users' },
  { code: PERMISSIONS.USER_DELETE, description: 'Delete users' },
  { code: PERMISSIONS.USER_DISABLE, description: 'Disable users' },

  // Role
  { code: PERMISSIONS.ROLE_READ, description: 'Read roles' },
  { code: PERMISSIONS.ROLE_CREATE, description: 'Create roles' },
  { code: PERMISSIONS.ROLE_UPDATE, description: 'Update roles' },
  { code: PERMISSIONS.ROLE_DELETE, description: 'Delete roles' },

  // Workshop / production structure
  { code: PERMISSIONS.WORKSHOP_READ, description: 'Read workshops' },
  { code: PERMISSIONS.WORKSHOP_CREATE, description: 'Create workshops' },
  { code: PERMISSIONS.WORKSHOP_UPDATE, description: 'Update workshops' },
  { code: PERMISSIONS.WORKSHOP_DELETE, description: 'Delete workshops' },

  { code: PERMISSIONS.PRODUCTION_LINE_READ, description: 'Read production lines' },
  { code: PERMISSIONS.PRODUCTION_LINE_CREATE, description: 'Create production lines' },
  { code: PERMISSIONS.PRODUCTION_LINE_UPDATE, description: 'Update production lines' },
  { code: PERMISSIONS.PRODUCTION_LINE_DELETE, description: 'Delete production lines' },

  { code: PERMISSIONS.POSITION_READ, description: 'Read positions' },
  { code: PERMISSIONS.POSITION_CREATE, description: 'Create positions' },
  { code: PERMISSIONS.POSITION_UPDATE, description: 'Update positions' },
  { code: PERMISSIONS.POSITION_DELETE, description: 'Delete positions' },

  // Devices & telemetry
  { code: PERMISSIONS.DEVICE_READ, description: 'Read devices' },
  { code: PERMISSIONS.DEVICE_CREATE, description: 'Create devices' },
  { code: PERMISSIONS.DEVICE_UPDATE, description: 'Update devices' },
  { code: PERMISSIONS.DEVICE_DELETE, description: 'Delete devices' },

  // Production & brick types
  { code: PERMISSIONS.PRODUCTION_READ, description: 'Read productions' },
  { code: PERMISSIONS.PRODUCTION_CREATE, description: 'Create productions' },
  { code: PERMISSIONS.PRODUCTION_UPDATE, description: 'Update productions' },
  { code: PERMISSIONS.PRODUCTION_DELETE, description: 'Delete productions' },

  { code: PERMISSIONS.BRICK_TYPE_READ, description: 'Read brick types' },
  { code: PERMISSIONS.BRICK_TYPE_CREATE, description: 'Create brick types' },
  { code: PERMISSIONS.BRICK_TYPE_UPDATE, description: 'Update brick types' },
  { code: PERMISSIONS.BRICK_TYPE_DELETE, description: 'Delete brick types' },

  // Metrics & quotas
  { code: PERMISSIONS.PRODUCTION_METRIC_READ, description: 'Read production metrics' },
  { code: PERMISSIONS.PRODUCTION_METRIC_CREATE, description: 'Create production metrics' },
  { code: PERMISSIONS.PRODUCTION_METRIC_UPDATE, description: 'Update production metrics' },
  { code: PERMISSIONS.PRODUCTION_METRIC_DELETE, description: 'Delete production metrics' },

  { code: PERMISSIONS.QUOTA_TARGET_READ, description: 'Read quota targets' },
  { code: PERMISSIONS.QUOTA_TARGET_CREATE, description: 'Create quota targets' },
  { code: PERMISSIONS.QUOTA_TARGET_UPDATE, description: 'Update quota targets' },
  { code: PERMISSIONS.QUOTA_TARGET_DELETE, description: 'Delete quota targets' },

  // Maintenance
  { code: PERMISSIONS.MAINTENANCE_LOG_READ, description: 'Read maintenance logs' },
  { code: PERMISSIONS.MAINTENANCE_LOG_CREATE, description: 'Create maintenance logs' },
  { code: PERMISSIONS.MAINTENANCE_LOG_UPDATE, description: 'Update maintenance logs' },
  { code: PERMISSIONS.MAINTENANCE_LOG_DELETE, description: 'Delete maintenance logs' },
];

const PERMISSION_GROUPS = {
  USER_MANAGE: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_DISABLE,
  ],
  ROLE_MANAGE: [
    PERMISSIONS.ROLE_READ,
    PERMISSIONS.ROLE_CREATE,
    PERMISSIONS.ROLE_UPDATE,
    PERMISSIONS.ROLE_DELETE,
  ],
  WORKSHOP_MANAGE: [
    PERMISSIONS.WORKSHOP_READ,
    PERMISSIONS.WORKSHOP_CREATE,
    PERMISSIONS.WORKSHOP_UPDATE,
    PERMISSIONS.WORKSHOP_DELETE,
  ],
  PRODUCTION_LINE_MANAGE: [
    PERMISSIONS.PRODUCTION_LINE_READ,
    PERMISSIONS.PRODUCTION_LINE_CREATE,
    PERMISSIONS.PRODUCTION_LINE_UPDATE,
    PERMISSIONS.PRODUCTION_LINE_DELETE,
  ],
  POSITION_MANAGE: [
    PERMISSIONS.POSITION_READ,
    PERMISSIONS.POSITION_CREATE,
    PERMISSIONS.POSITION_UPDATE,
    PERMISSIONS.POSITION_DELETE,
  ],
  DEVICE_MANAGE: [
    PERMISSIONS.DEVICE_READ,
    PERMISSIONS.DEVICE_CREATE,
    PERMISSIONS.DEVICE_UPDATE,
    PERMISSIONS.DEVICE_DELETE,
  ],
  PRODUCTION_MANAGE: [
    PERMISSIONS.PRODUCTION_READ,
    PERMISSIONS.PRODUCTION_CREATE,
    PERMISSIONS.PRODUCTION_UPDATE,
    PERMISSIONS.PRODUCTION_DELETE,
  ],
  BRICK_TYPE_MANAGE: [
    PERMISSIONS.BRICK_TYPE_READ,
    PERMISSIONS.BRICK_TYPE_CREATE,
    PERMISSIONS.BRICK_TYPE_UPDATE,
    PERMISSIONS.BRICK_TYPE_DELETE,
  ],
  PRODUCTION_METRIC_MANAGE: [
    PERMISSIONS.PRODUCTION_METRIC_READ,
    PERMISSIONS.PRODUCTION_METRIC_CREATE,
    PERMISSIONS.PRODUCTION_METRIC_UPDATE,
    PERMISSIONS.PRODUCTION_METRIC_DELETE,
  ],
  QUOTA_TARGET_MANAGE: [
    PERMISSIONS.QUOTA_TARGET_READ,
    PERMISSIONS.QUOTA_TARGET_CREATE,
    PERMISSIONS.QUOTA_TARGET_UPDATE,
    PERMISSIONS.QUOTA_TARGET_DELETE,
  ],
  MAINTENANCE_LOG_MANAGE: [
    PERMISSIONS.MAINTENANCE_LOG_READ,
    PERMISSIONS.MAINTENANCE_LOG_CREATE,
    PERMISSIONS.MAINTENANCE_LOG_UPDATE,
    PERMISSIONS.MAINTENANCE_LOG_DELETE,
  ],
};

const ROLE_DEFINITIONS = {
  superadmin: {
    name: 'Super Administrator',
    description: 'Toàn quyền hệ thống',
    permissions: PERMISSION_DEFINITIONS.map((p) => p.code),
  },
  admin: {
    name: 'Administrator',
    description: 'Quản trị viên',
    permissions: [
      ...PERMISSION_GROUPS.USER_MANAGE,
      ...PERMISSION_GROUPS.ROLE_MANAGE,
      ...PERMISSION_GROUPS.WORKSHOP_MANAGE,
      ...PERMISSION_GROUPS.PRODUCTION_LINE_MANAGE,
      ...PERMISSION_GROUPS.POSITION_MANAGE,
      ...PERMISSION_GROUPS.DEVICE_MANAGE,
      ...PERMISSION_GROUPS.BRICK_TYPE_MANAGE,
      ...PERMISSION_GROUPS.PRODUCTION_MANAGE,
      ...PERMISSION_GROUPS.PRODUCTION_METRIC_MANAGE,
      ...PERMISSION_GROUPS.QUOTA_TARGET_MANAGE,
      ...PERMISSION_GROUPS.MAINTENANCE_LOG_MANAGE,
    ],
  },
  operator: {
    name: 'Operator',
    description: 'Nhân viên vận hành',
    permissions: [
      PERMISSIONS.WORKSHOP_READ,
      PERMISSIONS.PRODUCTION_LINE_READ,
      PERMISSIONS.POSITION_READ,
      PERMISSIONS.DEVICE_READ,
      PERMISSIONS.BRICK_TYPE_READ,
      PERMISSIONS.PRODUCTION_READ,
      PERMISSIONS.PRODUCTION_METRIC_READ,
      PERMISSIONS.QUOTA_TARGET_READ,
      PERMISSIONS.MAINTENANCE_LOG_READ,
      PERMISSIONS.PRODUCTION_UPDATE,
      PERMISSIONS.PRODUCTION_METRIC_CREATE,
      PERMISSIONS.PRODUCTION_METRIC_UPDATE,
      PERMISSIONS.MAINTENANCE_LOG_CREATE,
      PERMISSIONS.MAINTENANCE_LOG_UPDATE,
    ],
  },
};

async function seedRBAC(dataSource: DataSource) {
  console.log('🔐 Starting RBAC seeding...\n');

  try {
    const passwordHash = await bcrypt.hash('admin123', 10);

    // Clean old RBAC data
    console.log('🧹 Cleaning old RBAC data...');
    await dataSource.query('DELETE FROM user_roles;');
    await dataSource.query('DELETE FROM role_permissions;');
    await dataSource.query('DELETE FROM roles;');
    await dataSource.query('DELETE FROM permissions;');

    // 1) PERMISSIONS
    console.log('📝 Seeding permissions...');
    for (const perm of PERMISSION_DEFINITIONS) {
      await dataSource.query(
        'INSERT INTO permissions (code, description) VALUES ($1, $2);',
        [perm.code, perm.description],
      );
    }

    // 2) ROLES
    console.log('📝 Seeding roles...');
    for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
      await dataSource.query(
        'INSERT INTO roles (slug, name, description) VALUES ($1, $2, $3);',
        [slug, def.name, def.description],
      );
    }

    const roles = await dataSource.query('SELECT id, slug FROM roles;');
    const permissions = await dataSource.query('SELECT id, code FROM permissions;');

    const roleBySlug = Object.fromEntries(roles.map((r) => [r.slug, r.id]));
    const permByCode = Object.fromEntries(permissions.map((p) => [p.code, p.id]));

    // 3) ROLE_PERMISSIONS
    console.log('🔗 Seeding role_permissions...');
    for (const [slug, def] of Object.entries(ROLE_DEFINITIONS)) {
      const roleId = roleBySlug[slug];
      if (!roleId) continue;

      const uniquePermCodes = Array.from(new Set(def.permissions));

      for (const code of uniquePermCodes) {
        const permId = permByCode[code];
        if (!permId) {
          console.warn(`⚠️  Permission code not found: ${code}`);
          continue;
        }

        await dataSource.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2);',
          [roleId, permId],
        );
      }
    }

    // 4) USERS
    console.log('👤 Seeding users...');
    const users = [
      { email: 'superadmin@example.com', username: 'superadmin', passwordHash },
      { email: 'admin@example.com', username: 'admin', passwordHash },
      { email: 'operator@example.com', username: 'operator', passwordHash },
    ];

    for (const user of users) {
      await dataSource.query(
        `INSERT INTO users (email, username, "passwordHash", "isActive")
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, "passwordHash" = EXCLUDED."passwordHash";`,
        [user.email, user.username, user.passwordHash],
      );
    }

    const dbUsers = await dataSource.query('SELECT id, username FROM users;');
    const userByUsername = Object.fromEntries(dbUsers.map((u) => [u.username, u.id]));

    // 5) USER_ROLES
    console.log('🔗 Seeding user_roles...');
    const userRolePairs = [
      { username: 'superadmin', roleSlug: 'superadmin' },
      { username: 'admin', roleSlug: 'admin' },
      { username: 'operator', roleSlug: 'operator' },
    ];

    for (const pair of userRolePairs) {
      const userId = userByUsername[pair.username];
      const roleId = roleBySlug[pair.roleSlug];
      if (!userId || !roleId) continue;

      await dataSource.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING;',
        [userId, roleId],
      );
    }

    console.log('✅ RBAC seeding completed!\n');
  } catch (err) {
    console.error('❌ Error while seeding RBAC:', err);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const allowedOrigins = [
    // Development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:19006',  // Expo Web
    'http://localhost:19000',  // Expo dev client

    // Android Emulator
    'http://10.0.2.2:8081',
    'http://10.0.3.2:8081',    // Genymotion

    // Add your production domains here
    // 'https://yourapp.com',
    // 'https://api.yourapp.com'
  ];

  // Enable CORS for all origins
  // app.enableCors({
  //   origin: (origin, callback) => {
  //     // Allow requests with no origin (like mobile apps, curl)
  //     if (!origin) return callback(null, true);

  //     if (allowedOrigins.indexOf(origin) === -1) {
  //       const msg = `CORS policy: ${origin} not allowed`;
  //       return callback(new Error(msg), false);
  //     }
  //     return callback(null, true);
  //   },
  //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  //   allowedHeaders: [
  //     'Content-Type',
  //     'Authorization',
  //     'X-Requested-With',
  //     'Accept',
  //     'X-Refresh-Token',
  //     'X-Request-Id'
  //   ],
  //   exposedHeaders: [
  //     'Content-Range',
  //     'X-Content-Range',
  //     'X-Total-Count',
  //     'X-Total-Pages'
  //   ],
  //   credentials: true,
  //   maxAge: 86400,  // 24 hours
  //   preflightContinue: false,
  //   optionsSuccessStatus: 204
  // });
  app.enableCors({
    origin: true, // <--- Cho phép tất cả origin
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'X-Refresh-Token',
      'X-Request-Id'
    ],
    credentials: true,
  });

  // App use CookieParser
  app.use(cookieParser());

  // Auto-seed devices on startup
  const dataSource = app.get(DataSource);
  
  // Seed RBAC (permissions, roles, users)
  await seedRBAC(dataSource);
  
  // Seed other data
  await seedBrickTypesFromTable(dataSource);
  await seedWorkShopProductionLine(dataSource);
  await seedProductionStages(dataSource);

  // Seed measurement types and device cluster
  const measurementTypeId = await seedMeasurementTypes(dataSource);
  await seedDeviceCluster(dataSource, measurementTypeId);

  await seedDevices(dataSource);

  // Validator Request Body Pipe 
  // app.useGlobalPipes(new ValidationPipe({
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //     transform: true,
  // }));
  await app.listen(process.env.PORT ?? 5555, '0.0.0.0');
}
async function seedProductionStages(dataSource: DataSource) {
  const productionLineRepo = dataSource.getRepository(ProductionLine);
  const productionStageRepo = dataSource.getRepository(ProductionStage);
  const positionRepo = dataSource.getRepository(Position);

  // Define production line names
  const productionLineNames = ['Dây chuyền 1', 'Dây chuyền 2', 'Dây chuyền 5', 'Dây chuyền 6'];

  // Base stages for most production lines
  const baseStages = [
    {
      name: 'Ép',
      description: 'Công đoạn ép gạch',
      order: 1,
      positions: [
        { name: 'Sau máy ép', description: 'Vị trí sau máy ép', index: 1 },
      ]
    },
    {
      name: 'Nung',
      description: 'Công đoạn nung gạch',
      order: 2,
      positions: [
        { name: 'Trước lò nung', description: 'Trước lò nung', index: 1 },
        { name: 'Sau lò nung', description: 'Sau lò nung', index: 2 }
      ]
    },
    {
      name: 'Mài',
      description: 'Công đoạn mài gạch',
      order: 3,
      positions: [
        { name: 'Trước mài', description: 'Trước mài', index: 1 },
        { name: 'Sau mài', description: 'Sau mài', index: 2 }
      ]
    },
    {
      name: 'Đóng hộp',
      description: 'Công đoạn đóng gói thành phẩm',
      order: 4,
      positions: [
        { name: 'Trước đóng hộp', description: 'Bàn đóng gói số 1', index: 1 },
      ]
    },
  ];

  // Special stages for production line 5 (Dây chuyền 5)
  const line5Stages = [
    {
      name: 'Ép',
      description: 'Công đoạn ép gạch',
      order: 1,
      positions: [
        { name: 'Sau máy ép', description: 'Vị trí sau máy ép dây chuyền 5', index: 1 },
      ]
    },
    {
      name: 'Nung xương',
      description: 'Công đoạn nung xương gạch',
      order: 2,
      positions: [
        { name: 'Trước lò nung xương', description: 'Trước lò nung xương dây chuyền 5', index: 1 },
        { name: 'Sau lò nung xương', description: 'Sau lò nung xương dây chuyền 5', index: 2 }
      ]
    },
    {
      name: 'Nung men',
      description: 'Công đoạn nung men gạch',
      order: 3,
      positions: [
        { name: 'Trước lò nung men', description: 'Trước lò nung men dây chuyền 5', index: 1 },
        { name: 'Sau lò nung men', description: 'Sau lò nung men dây chuyền 5', index: 2 }
      ]
    },
    {
      name: 'Mài',
      description: 'Công đoạn mài gạch',
      order: 4,
      positions: [
        { name: 'Trước mài', description: 'Trước mài dây chuyền 5', index: 1 },
        { name: 'Sau mài', description: 'Sau mài dây chuyền 5', index: 2 }
      ]
    },
    {
      name: 'Đóng hộp',
      description: 'Công đoạn đóng gói thành phẩm',
      order: 5,
      positions: [
        { name: 'Bàn đóng gói', description: 'Bàn đóng gói số 1 dây chuyền 5', index: 1 },
      ]
    },
  ];

  // Special stages for production line 6 (Dây chuyền 6)
  const line6Stages = [
    {
      name: 'Ép',
      description: 'Công đoạn ép gạch',
      order: 1,
      positions: [
        { name: 'Sau máy ép', description: 'Vị trí sau máy ép dây chuyền 6', index: 1 },
      ]
    },
    {
      name: 'Sấy',
      description: 'Công đoạn sấy gạch',
      order: 2,
      positions: [
        { name: 'Trước lò sấy', description: 'Trước lò sấy dây chuyền 6', index: 1 },
        { name: 'Sau lò sấy', description: 'Sau lò sấy dây chuyền 6', index: 2 }
      ]
    },
    {
      name: 'Nung',
      description: 'Công đoạn nung gạch',
      order: 3,
      positions: [
        { name: 'Trước lò nung', description: 'Trước lò nung dây chuyền 6', index: 1 },
        { name: 'Sau lò nung', description: 'Sau lò nung dây chuyền 6', index: 2 }
      ]
    },
    {
      name: 'Mài',
      description: 'Công đoạn mài gạch',
      order: 4,
      positions: [
        { name: 'Trước mài', description: 'Trước mài dây chuyền 6', index: 1 },
        { name: 'Sau mài', description: 'Sau mài dây chuyền 6', index: 2 }
      ]
    },
    {
      name: 'Đóng hộp',
      description: 'Công đoạn đóng gói thành phẩm',
      order: 5,
      positions: [
        { name: 'Bàn đóng gói', description: 'Bàn đóng gói số 1 dây chuyền 6', index: 1 },
      ]
    },
  ];

  for (const lineName of productionLineNames) {
    // Find production line by name
    const productionLine = await productionLineRepo.findOne({
      where: { name: lineName },
      relations: ['workshop']
    });

    if (!productionLine) {
      console.warn(`⚠️  Production line "${lineName}" not found, skipping...`);
      continue;
    }

    console.log(`\n🔧 Seeding stages for production line: ${lineName} (ID: ${productionLine.id})`);

    // Use different stages based on production line name
    let stagesToUse = baseStages;
    if (lineName === 'Dây chuyền 5') {
      stagesToUse = line5Stages;
      console.log(`   → Using special stages for Dây chuyền 5`);
    } else if (lineName === 'Dây chuyền 6') {
      stagesToUse = line6Stages;
      console.log(`   → Using special stages for Dây chuyền 6`);
    }

    for (const stageData of stagesToUse) {
      // Check if stage already exists for this line
      let stage = await productionStageRepo.findOne({
        where: {
          name: stageData.name,
          productionLine: { name: lineName }
        },
        relations: ['positions']
      });

      if (!stage) {
        // Create the stage first
        stage = productionStageRepo.create({
          name: stageData.name,
          description: stageData.description,
          order: stageData.order,
          productionLine,
          isActive: false,
          status: 'pending'
        });
        await productionStageRepo.save(stage);
      }

      // Create positions for this stage if they don't exist
      for (const positionData of stageData.positions) {
        const existingPosition = await positionRepo.findOne({
          where: {
            name: positionData.name,
            productionLine: { id: productionLine.id },
            productionStage: { id: stage.id }
          }
        });

        if (!existingPosition) {
          const position = positionRepo.create({
            ...positionData,
            productionLine,
            productionStage: stage
          });
          await positionRepo.save(position);
        }
      }
    }
  }
}

bootstrap();

