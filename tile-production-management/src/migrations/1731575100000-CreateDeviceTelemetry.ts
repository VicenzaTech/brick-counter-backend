import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateDeviceTelemetry1731575100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create device_telemetry table
    await queryRunner.createTable(
      new Table({
        name: 'device_telemetry',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'deviceId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'positionId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'count',
            type: 'int',
            default: 0,
          },
          {
            name: 'errCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'rssi',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'battery',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'temperature',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'uptime',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'lastMessageAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'rawData',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create index on deviceId for faster queries
    await queryRunner.createIndex(
      'device_telemetry',
      new TableIndex({
        name: 'IDX_DEVICE_TELEMETRY_DEVICE_ID',
        columnNames: ['deviceId'],
      }),
    );

    // Create index on positionId for faster queries
    await queryRunner.createIndex(
      'device_telemetry',
      new TableIndex({
        name: 'IDX_DEVICE_TELEMETRY_POSITION_ID',
        columnNames: ['positionId'],
      }),
    );

    // Create foreign key to positions table
    await queryRunner.createForeignKey(
      'device_telemetry',
      new TableForeignKey({
        columnNames: ['positionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'positions',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('device_telemetry');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('positionId') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('device_telemetry', foreignKey);
      }
    }

    // Drop indexes
    await queryRunner.dropIndex('device_telemetry', 'IDX_DEVICE_TELEMETRY_POSITION_ID');
    await queryRunner.dropIndex('device_telemetry', 'IDX_DEVICE_TELEMETRY_DEVICE_ID');

    // Drop table
    await queryRunner.dropTable('device_telemetry');
  }
}
