import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCsvStandardFieldsToBrickTypes1734527400000
  implements MigrationInterface
{
  name = 'AddCsvStandardFieldsToBrickTypes1734527400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Thong tin san pham
    await queryRunner.query(`
      ALTER TABLE "brick_types" 
      ADD COLUMN IF NOT EXISTS "nameEnglish" TEXT,
      ADD COLUMN IF NOT EXISTS "thickness" DECIMAL(4,1),
      ADD COLUMN IF NOT EXISTS "brickType" TEXT;
    `);

    // Thong tin dong goi & logistics
    await queryRunner.query(`
      ALTER TABLE "brick_types" 
      ADD COLUMN IF NOT EXISTS "weightPerM2" DECIMAL(5,1),
      ADD COLUMN IF NOT EXISTS "piecesPerBox" INTEGER,
      ADD COLUMN IF NOT EXISTS "m2PerBox" DECIMAL(5,2),
      ADD COLUMN IF NOT EXISTS "weightPerBox" DECIMAL(5,1),
      ADD COLUMN IF NOT EXISTS "boxesPerPallet" INTEGER;
    `);

    // Tieu chuan & phan loai
    await queryRunner.query(`
      ALTER TABLE "brick_types" 
      ADD COLUMN IF NOT EXISTS "qualityStandard" TEXT,
      ADD COLUMN IF NOT EXISTS "productLineName" TEXT,
      ADD COLUMN IF NOT EXISTS "notes" TEXT;
    `);

    // Create indexes for frequently queried fields
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_brick_types_brick_type" 
      ON "brick_types" ("brickType");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_brick_types_quality_standard" 
      ON "brick_types" ("qualityStandard");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_brick_types_thickness" 
      ON "brick_types" ("thickness");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_brick_types_thickness";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_brick_types_quality_standard";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_brick_types_brick_type";
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "brick_types" 
      DROP COLUMN IF EXISTS "notes",
      DROP COLUMN IF EXISTS "productLineName",
      DROP COLUMN IF EXISTS "qualityStandard",
      DROP COLUMN IF EXISTS "boxesPerPallet",
      DROP COLUMN IF EXISTS "weightPerBox",
      DROP COLUMN IF EXISTS "m2PerBox",
      DROP COLUMN IF EXISTS "piecesPerBox",
      DROP COLUMN IF EXISTS "weightPerM2",
      DROP COLUMN IF EXISTS "brickType",
      DROP COLUMN IF EXISTS "thickness",
      DROP COLUMN IF EXISTS "nameEnglish";
    `);
  }
}
