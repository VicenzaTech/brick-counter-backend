import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Ajv, { ValidateFunction } from 'ajv';
import { Device } from 'src/devices/entities/device.entity';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import { MeasurementType } from 'src/measurement-types/entities/measurement-types.entity';
import { Measurement } from './entities/measurement.entity';
import type { Redis } from 'ioredis';
import { REDIS_PROVIDER } from 'src/common/redis/redis.constant';

type IngestInput = {
    deviceId: string;
    data: Record<string, any>;
    timestamp?: Date;
};

type DeviceContextCache = {
    device_id: number;
    cluster_id: number | null;
    type_id: number;
    type_code: string;
};

@Injectable()
export class MeasurementService {
    private readonly logger = new Logger(MeasurementService.name);
    private readonly ajv = new Ajv({ allErrors: true });
    private readonly validators = new Map<string, ValidateFunction>();
    private readonly deviceCtxKeyPrefix = 'measurement:device_ctx:';

    constructor(
        @InjectRepository(Device)
        private readonly deviceRepository: Repository<Device>,
        @InjectRepository(DeviceCluster)
        private readonly clusterRepository: Repository<DeviceCluster>,
        @InjectRepository(MeasurementType)
        private readonly mtRepository: Repository<MeasurementType>,
        @InjectRepository(Measurement)
        private readonly measurementRepository: Repository<Measurement>,
        @Inject(REDIS_PROVIDER)
        private readonly redis: Redis,
    ) { }

    private getValidatorKey(typeId: number, version?: number) {
        return `${typeId}:${version ?? 0}`;
    }

    private async getValidator(type: MeasurementType): Promise<ValidateFunction> {
        const key = this.getValidatorKey(type.id, type.data_schema_version);
        if (this.validators.has(key)) {
            return this.validators.get(key)!;
        }
        try {
            const validator = this.ajv.compile(type.data_schema);
            this.validators.set(key, validator);
            return validator;
        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Invalid schema';
            throw new BadRequestException(`Measurement type schema invalid: ${msg}`);
        }
    }

    private async resolveDeviceContext(deviceId: string): Promise<DeviceContextCache> {
        const cacheKey = `${this.deviceCtxKeyPrefix}${deviceId}`;

        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached) as DeviceContextCache;
            }
        } catch (error) {
            this.logger.warn(
                `Redis get error for key ${cacheKey}: ${(error as Error).message}`,
            );
        }

        const device = await this.deviceRepository.findOne({
            where: { deviceId },
            relations: ['cluster', 'cluster.measurementType'],
        });
        if (!device) {
            throw new NotFoundException(`Device ${deviceId} not found`);
        }

        const cluster = device.cluster ?? null;
        const measurementType = cluster?.measurementType;
        if (!measurementType) {
            throw new NotFoundException(
                `Measurement type not found for device ${deviceId} (cluster missing type)`,
            );
        }

        const ctx: DeviceContextCache = {
            device_id: device.id,
            cluster_id: cluster?.id ?? null,
            type_id: measurementType.id,
            type_code: measurementType.code,
        };

        try {
            await this.redis.set(cacheKey, JSON.stringify(ctx), 'EX', 60 * 60);
        } catch (error) {
            this.logger.warn(
                `Redis set error for key ${cacheKey}: ${(error as Error).message}`,
            );
        }

        return ctx;
    }

    async ingest(input: IngestInput): Promise<void> {
        const timestamp = input.timestamp ?? new Date();
        const { device_id, cluster_id, type_id, type_code } =
            await this.resolveDeviceContext(input.deviceId);

        const measurementType = await this.mtRepository.findOne({
            where: { id: type_id },
        });
        if (!measurementType) {
            throw new NotFoundException(
                `Measurement type ID ${type_id} not found for device ${input.deviceId}`,
            );
        }

        const validator = await this.getValidator(measurementType);
        const valid = validator(input.data);
        if (!valid) {
            const errors = validator.errors
                ?.map((e: any) => `${e.instancePath} ${e.message}`)
                .join('; ');
            throw new BadRequestException(
                `Payload does not match schema for ${measurementType.code}: ${errors}`,
            );
        }

        await this.measurementRepository.insert({
            device_id,
            cluster_id,
            type_id,
            timestamp,
            data: input.data,
        });

        await this.deviceRepository.update(device_id, { lastSeenAt: new Date() });

        this.logger.debug(
            `Saved measurement for device ${input.deviceId} type ${type_code} at ${timestamp.toISOString()}`,
        );
    }
}

