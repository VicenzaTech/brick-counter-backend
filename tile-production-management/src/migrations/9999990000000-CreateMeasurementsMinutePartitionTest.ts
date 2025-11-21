// src/migrations/9999990000000-CreateMeasurementsMinutePartitionTest.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeasurementsMinutePartitionTest9999990000000
  implements MigrationInterface
{
  name = 'CreateMeasurementsMinutePartitionTest9999990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Sequence cho id
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS measurements_id_seq;
    `);

    // Bảng cha partitioned theo RANGE(timestamp)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS measurements (
        id           BIGINT        NOT NULL DEFAULT nextval('measurements_id_seq'),
        device_id    INT           NOT NULL,
        cluster_id   INT           NOT NULL,
        type_id      INT           NOT NULL,
        timestamp    TIMESTAMPTZ   NOT NULL,
        ingest_time  TIMESTAMPTZ   DEFAULT now(),
        data         JSONB         NOT NULL,
        CONSTRAINT pk_measurements PRIMARY KEY (id, timestamp)
      )
      PARTITION BY RANGE (timestamp);
    `);

    // Index cơ bản
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_measurements_device_time
        ON measurements (device_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_measurements_cluster_time
        ON measurements (cluster_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_measurements_type_time
        ON measurements (type_id, timestamp DESC);
    `);

    // Default partition (phòng case chưa kịp tạo minute-partition)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS measurements_default
      PARTITION OF measurements
      DEFAULT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS measurements_default CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS measurements CASCADE;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS measurements_id_seq;`);
  }
}
