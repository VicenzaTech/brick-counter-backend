import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import type { DeviceExtraInfo } from './common/mqtt/device-extra-info';
import { ValidationPipe } from '@nestjs/common';
import { Measurement } from 'src/measurement/entities/measurement.entity';
import { MeasurementType } from 'src/measurement-types/entities/measurement-types.entity';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import * as fs from 'fs'; // <-- Thêm dòng này
import * as path from 'path'; // <-- Thêm dòng này

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
    // await seedBrickTypes(dataSource);

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
    const lineNames = ['Dây chuyền 1', 'Dây chuyền 2', "Dây chuyền 5", "Dây chuyền 6"];
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

  // app.enableCors({
  //     origin: '*',
  //     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  //     credentials: true,
  // });

  // App use CookieParser
  app.use(cookieParser());

  // Auto-seed devices on startup
  const dataSource = app.get(DataSource);
  await seedDevices(dataSource);
  await seedMeasurements(dataSource);
  await seedBrickTypesFromTable(dataSource);
  // Validator Request Body Pipe 
  // app.useGlobalPipes(new ValidationPipe({
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //     transform: true,
  // }));
  await app.listen(process.env.PORT ?? 5555);
}
bootstrap();

