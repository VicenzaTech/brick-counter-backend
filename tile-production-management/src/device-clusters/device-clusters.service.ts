import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceCluster } from './entities/device-cluster.entity';
import { MeasurementType } from 'src/measurement-types/entities/measurement-types.entity';
import { CreateDeviceClusterDto } from './dtos/create-device-cluster.dto';
import { UpdateDeviceClusterDto } from './dtos/update-device-cluster.dto';
import { ProductionLine } from 'src/production-lines/entities/production-line.entity';
import { Device } from 'src/devices/entities/device.entity';
import type { ClusterConfig } from 'src/common/mqtt/cluster-config';

const DEVICE_CLUSTER_TOPIC_KEY = '{clusterId}'

@Injectable()
export class DeviceClustersService {
    constructor(
        @InjectRepository(DeviceCluster)
        private readonly clusterRepository: Repository<DeviceCluster>,
        @InjectRepository(MeasurementType)
        private readonly measurementTypeRepository: Repository<MeasurementType>,
        @InjectRepository(ProductionLine)
        private readonly productionLineRepository: Repository<ProductionLine>,
        @InjectRepository(Device)
        private readonly deviceRepository: Repository<Device>,
    ) { }

    private validateClusterConfig(config?: ClusterConfig) {
        if (!config) return;
        if (config.qosDefault !== undefined && ![0, 1, 2].includes(config.qosDefault)) {
            throw new BadRequestException('qosDefault must be 0, 1, or 2');
        }
        if (config.interval_message_time !== undefined && config.interval_message_time <= 0) {
            throw new BadRequestException('interval_message_time must be a positive number');
        }
        if (config.telemetry) {
            if (!config.telemetry.topic || !config.telemetry.topic.trim()) {
                throw new BadRequestException('telemetry.topic must be a non-empty string');
            }
            if (config.telemetry.qos !== undefined && ![0, 1, 2].includes(config.telemetry.qos)) {
                throw new BadRequestException('telemetry.qos must be 0, 1, or 2');
            }
        }
        if (config.commands !== undefined) {
            if (!Array.isArray(config.commands)) {
                throw new BadRequestException('commands must be an array');
            }
            for (const cmd of config.commands) {
                if (!cmd.code?.trim()) {
                    throw new BadRequestException('command.code must be a non-empty string');
                }
                if (!cmd.topic?.trim()) {
                    throw new BadRequestException('command.topic must be a non-empty string');
                }
            }
        }
    }

    async create(dto: CreateDeviceClusterDto): Promise<DeviceCluster> {
        // Ensure unique code
        const existing = await this.clusterRepository.findOne({
            where: { code: dto.code },
        });

        if (existing) {
            throw new ConflictException(
                `Device cluster with code "${dto.code}" already exists`,
            );
        }

        // Ensure measurement type exists
        const measurementType = await this.measurementTypeRepository.findOne({
            where: { id: dto.measurementTypeId },
        });

        if (!measurementType) {
            throw new NotFoundException(
                `Measurement type with ID ${dto.measurementTypeId} not found`,
            );
        }

        let productionLine: ProductionLine | null = null;
        if (!dto.productionLineId) throw new BadRequestException('Device cluster must in a production line')
        const foundLine = await this.productionLineRepository.findOne({
            where: { id: dto.productionLineId },
        });

        if (!foundLine) {
            throw new NotFoundException(
                `Production line with ID ${dto.productionLineId} not found`,
            );
        }
        productionLine = foundLine;
        this.validateClusterConfig(dto.config);
        const commands = dto.config?.commands
        const code = dto.code
        const topic = dto.config?.telemetry?.topic

        if (dto?.config?.commands) {
            let mappingCmd: typeof commands = [];
            if (commands?.length) {
                mappingCmd = commands.map(cmd => (
                    {
                        ...cmd,
                        topic: cmd.topic?.replace(DEVICE_CLUSTER_TOPIC_KEY, code)
                    }
                )) ?? [];
            }

            dto.config.commands = mappingCmd;

        }

        if (topic) {
            dto.config!.telemetry!.topic = topic.replace(DEVICE_CLUSTER_TOPIC_KEY, code);
        }
        const cluster = this.clusterRepository.create({
            ...dto,
            productionLine,
            measurementType,
        });

        return this.clusterRepository.save(cluster);
    }

    async findAll(): Promise<DeviceCluster[]> {
        return this.clusterRepository.find({
            relations: ['productionLine', 'measurementType'],
            order: { id: 'ASC' },
        });
    }

    async findOne(id: number): Promise<DeviceCluster> {
        const cluster = await this.clusterRepository.findOne({
            where: { id },
            relations: ['productionLine', 'measurementType'],
        });

        if (!cluster) {
            throw new NotFoundException(`Device cluster with ID ${id} not found`);
        }

        return cluster;
    }

    async update(
        id: number,
        dto: UpdateDeviceClusterDto,
    ): Promise<DeviceCluster> {
        const cluster = await this.findOne(id);

        if (dto.code && dto.code !== cluster.code) {
            const existing = await this.clusterRepository.findOne({
                where: { code: dto.code },
            });
            if (existing && existing.id !== id) {
                throw new ConflictException(
                    `Device cluster with code "${dto.code}" already exists`,
                );
            }
        }

        if (dto.measurementTypeId && dto.measurementTypeId !== cluster.measurementTypeId) {
            const measurementType = await this.measurementTypeRepository.findOne({
                where: { id: dto.measurementTypeId },
            });
            if (!measurementType) {
                throw new NotFoundException(
                    `Measurement type with ID ${dto.measurementTypeId} not found`,
                );
            }
            cluster.measurementType = measurementType;
            cluster.measurementTypeId = dto.measurementTypeId;
        }

        this.validateClusterConfig(dto.config);
        if (dto.code) cluster.code = dto.code
        
        const commands = dto.config?.commands
        const code = cluster.code
        const topic = dto.config?.telemetry?.topic

        if (dto?.config?.commands) {
            let mappingCmd: typeof commands = [];
            if (commands?.length) {
                mappingCmd = commands.map(cmd => (
                    {
                        ...cmd,
                        topic: cmd.topic?.replace(DEVICE_CLUSTER_TOPIC_KEY, code)
                    }
                )) ?? [];
            }

            dto.config.commands = mappingCmd;

        }

        if (topic) {
            dto.config!.telemetry!.topic = topic.replace(DEVICE_CLUSTER_TOPIC_KEY, code);
        }
        if (dto.productionLineId !== undefined) {
            if (dto.productionLineId === null) {
                cluster.productionLine = null;
                cluster.productionLineId = null;
            } else if (dto.productionLineId !== cluster.productionLineId) {
                const foundLine = await this.productionLineRepository.findOne({
                    where: { id: dto.productionLineId },
                });

                if (!foundLine) {
                    throw new NotFoundException(
                        `Production line with ID ${dto.productionLineId} not found`,
                    );
                }

                cluster.productionLine = foundLine;
                cluster.productionLineId = dto.productionLineId;
            }
        }

        Object.assign(cluster, {
            ...dto,
            measurementTypeId: cluster.measurementTypeId,
            productionLineId: cluster.productionLineId,
        });

        return this.clusterRepository.save(cluster);
    }

    async remove(id: number): Promise<void> {
        const cluster = await this.findOne(id);

        // Ràng buộc: không cho xóa nếu còn thiết bị thuộc về cluster này
        const deviceCount = await this.deviceRepository.count({
            where: { cluster: { id } },
        });

        if (deviceCount > 0) {
            throw new ConflictException(
                `Không thể xóa device cluster ID ${id} vì còn ${deviceCount} thiết bị đang sử dụng.`,
            );
        }

        await this.clusterRepository.remove(cluster);
    }
}
