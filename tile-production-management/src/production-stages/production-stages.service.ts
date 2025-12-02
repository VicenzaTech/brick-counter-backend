import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProductionStage } from './entities/production-stage.entity';
import { CreateProductionStageDto } from './dtos/create-production-stage.dto';
import { UpdateProductionStageDto } from './dtos/update-production-stage.dto';
import { UpdateProductionStageStatusDto } from './dtos/update-production-stage-status.dto';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { Position } from '../positions/entities/position.entity';
import { ActivityLogService } from 'src/activity-log/activity-log.service';
import { ActivityAction, ActivityEntityType, ActivitySource } from 'src/activity-log/entities/activity-log.enum';
import { LogDTO } from 'src/activity-log/dto/log.dto';
import { ActivityStatus, ActivitySeverity } from 'src/activity-log/entities/activity-log.enum';
import { BrickType } from '../brick-types/entities/brick-type.entity';
import { User } from 'src/users/entities/user.entity';
import { SimpleUniversalMqttService } from '../mqtt/services/simple-universal-mqtt.service';
import { SimpleUniversalHandler } from '../mqtt/handlers/simple-universal.handler';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import { Measurement } from '../measurement/entities/measurement.entity';
import { Device } from '../devices/entities/device.entity';

@Injectable()
export class ProductionStagesService {
    private readonly logger = new Logger(ProductionStagesService.name);

    constructor(
        @InjectRepository(ProductionStage)
        private readonly productionStageRepo: Repository<ProductionStage>,
        @InjectRepository(ProductionLine)
        private readonly productionLineRepo: Repository<ProductionLine>,
        @InjectRepository(Position)
        private readonly positionRepo: Repository<Position>,
        @InjectRepository(BrickType)
        private readonly brickTypeRepo: Repository<BrickType>,

        @InjectRepository(DeviceCluster)
        private readonly clusterRepo: Repository<DeviceCluster>,

        @InjectRepository(Measurement)
        private readonly measurementRepo: Repository<Measurement>,

        @InjectRepository(Device)
        private readonly deviceRepo: Repository<Device>,

        private readonly activityLogService: ActivityLogService,
        private readonly mqttService: SimpleUniversalMqttService,
        private readonly mqttHandler: SimpleUniversalHandler,
    ) { }

    async create(createDto: CreateProductionStageDto): Promise<ProductionStage> {
        // Check if production line exists
        const productionLine = await this.productionLineRepo.findOne({
            where: { id: createDto.productionLineId },
        });
        if (!productionLine) {
            throw new NotFoundException(
                `ProductionLine with ID ${createDto.productionLineId} not found`,
            );
        }

        // Create the production stage
        const stage = this.productionStageRepo.create({
            ...createDto,
            productionLine,
        });

        return await this.productionStageRepo.save(stage);
    }

    async findAll(): Promise<ProductionStage[]> {
        return this.productionStageRepo.find({
            relations: ['productionLine', 'positions'],
            order: { order: 'ASC' },
        });
    }

    async findOne(id: number): Promise<ProductionStage> {
        const stage = await this.productionStageRepo.findOne({
            where: { id },
            relations: ['productionLine', 'positions'],
        });

        if (!stage) {
            throw new NotFoundException(`ProductionStage with ID ${id} not found`);
        }

        return stage;
    }

    async update(
        id: number,
        updateDto: UpdateProductionStageDto,
    ): Promise<ProductionStage> {
        const stage = await this.productionStageRepo.findOne({
            where: { id },
            relations: ['productionLine', 'positions'],
        });

        if (!stage) {
            throw new NotFoundException(`ProductionStage with ID ${id} not found`);
        }

        // Handle production line update
        if ('productionLineId' in updateDto) {
            const productionLine = await this.productionLineRepo.findOne({
                where: { id: updateDto.productionLineId },
            });
            if (!productionLine) {
                throw new NotFoundException(
                    `ProductionLine with ID ${updateDto.productionLineId} not found`,
                );
            }
            stage.productionLine = productionLine;
        }

        // Update other fields
        Object.assign(stage, updateDto);

        return this.productionStageRepo.save(stage);
    }

    async remove(id: number): Promise<void> {
        const result = await this.productionStageRepo.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`ProductionStage with ID ${id} not found`);
        }
    }

    async findStagesByProductionLine(productionLineId: number): Promise<ProductionStage[]> {
        return this.productionStageRepo.find({
            where: { productionLine: { id: productionLineId } },
            relations: ['productionLine', 'positions'],
            order: { order: 'ASC' },
        });
    }

    async updateStatus(updateStatusDto: UpdateProductionStageStatusDto): Promise<ProductionStage> {
        // Find the stage by production line and name
        // ⭐ Load stage with relations: positions -> devices -> cluster (để lấy cluster.code)
        const stage = await this.productionStageRepo.findOne({
            where: {
                name: updateStatusDto.stageName,
                productionLine: { id: updateStatusDto.productionLineId }
            },
            relations: ['productionLine', 'positions', 'positions.devices', 'positions.devices.cluster']
        });
        this.logger.log(`🔄 Updating status for stage '${updateStatusDto.stageName}' on production line ID ${updateStatusDto.productionLineId} to '${updateStatusDto.status}'`);
        if (!stage) {
            throw new NotFoundException(
                `Production stage '${updateStatusDto.stageName}' not found for production line ${updateStatusDto.productionLineId}`
            );
        }

        //status='running', reset counter cho tất cả thiết bị tại stage này
        if (updateStatusDto.status === 'running') {
            const devices = stage.positions?.flatMap(position => position.devices || []) || [];
            
            this.logger.log(`🎯 Starting production for stage '${stage.name}'`);
            this.logger.log(`   Found ${devices.length} devices`);
            
            // BƯỚC 1: Send MQTT reset_counters command
            for (const device of devices) {
                if (!device.deviceId || !device.clusterId) {
                    this.logger.warn(`   ⚠️ Device ${device.deviceId} missing deviceId or cluster, skipping...`);
                    continue;
                }
                
                const cluster = await this.clusterRepo.findOne({ where: { id: device.clusterId } });
                if (!cluster) {
                    this.logger.warn(`   ⚠️ Cluster with ID ${device.clusterId} not found for device ${device.deviceId}, skipping...`);
                    continue;
                }
                const clusterCode = cluster?.code;
                if (!clusterCode) { 
                    this.logger.warn(`   ⚠️ Cluster not found for device ${device.deviceId}, skipping...`);
                    continue;
                }
                const resetCommand = {
                    action: 'reset_counters',
                };
                
                try {
                    this.logger.log(`   📤 Sending RESET_COUNTER to ${clusterCode}/${device.deviceId}`);
                    await this.mqttService.publishCommand(clusterCode, device.deviceId, resetCommand);
                    this.logger.log(`   ✅ Reset command sent successfully`);
                } catch (error) {
                    this.logger.error(`   ❌ Failed to send reset command to ${device.deviceId}:`, error.message);
                }
            }
            
            // BƯỚC 2: Activate devices để bắt đầu lưu telemetry
            const deviceIds = devices.map(d => d.deviceId).filter(Boolean);
            if (deviceIds.length > 0) {
                this.mqttHandler.activateDevices(deviceIds);
                this.logger.log(`   ✅ Activated ${deviceIds.length} devices for telemetry tracking`);
            }
        }
        
        // Deactivate devices chỉ khi: waiting_log → pending (sau khi chốt sản lượng)
        if (stage.status === 'waiting_log' && updateStatusDto.status === 'pending') {
            const devices = stage.positions?.flatMap(position => position.devices || []) || [];
            const deviceIds = devices.map(d => d.deviceId).filter(Boolean);
            
            if (deviceIds.length > 0) {
                this.mqttHandler.deactivateDevices(deviceIds);
                this.logger.log(`   🛑 Deactivated ${deviceIds.length} devices (production completed, returned to pending)`);
            }
        }

        // Convert trạng thái sang text tiếng Việt
        const statusTextMap: Record<string, string> = {
            pending: 'Đang tạm dừng',
            running: 'Đang sản xuất',
            waiting_log: 'Chờ chốt sản lượng',
        };
        const oldStatusText = statusTextMap[stage.status] || stage.status;
        const newStatusText = statusTextMap[updateStatusDto.status] || updateStatusDto.status;

        // Lấy tên dòng sản phẩm từ productId nếu có
        let productName = '';
        if (updateStatusDto.productId) {
            const brickType = await this.brickTypeRepo.findOne({ where: { id: updateStatusDto.productId } });
            productName = brickType ? brickType.name : `${updateStatusDto.productId}`;
        }

        const logDto = new LogDTO();
        logDto.action = 'UPDATE';
        //TODO: Set user ID
        // logDto.userId = user.id;
        //
        logDto.actionType = 'UPDATE_PRODUCTION_STAGE_STATUS';
        logDto.entityType = ActivityEntityType.ProductionStage;
        logDto.description = `Cập nhật trạng thái công đoạn '${stage.name}' cho dây chuyền ${stage.productionLineId}` +
            (productName ? ` áp dụng cho dòng sản phẩm ${productName}` : '') +
            ` từ ${oldStatusText} thành ${newStatusText}`;
        logDto.entityId = stage.id;
        logDto.status = ActivityStatus.SUCCESS;
        logDto.severity = ActivitySeverity.INFO;
        logDto.source = ActivitySource.WEB_APP;

        // Update status and other fields
        stage.status = updateStatusDto.status;

        // Update product ID if provided
        if (updateStatusDto.productId !== undefined) {
            stage.productId = updateStatusDto.productId;
        }

        await this.activityLogService.log(logDto);
        return this.productionStageRepo.save(stage);
    }

    async getProductionStagesByProductionLineId(productionLineId: number) {
        // Find all production stages for the given production line ID
        const stages = await this.productionStageRepo.find({
            where: { productionLineId },
            order: { order: 'ASC' }, // Assuming you have an 'order' field to maintain stage sequence
            relations: ['productionLine'] // Include production line relation if needed
        });

        if (!stages || stages.length === 0) {
            throw new NotFoundException(`No production stages found for production line ID: ${productionLineId}`);
        }

        return stages;
    }

    /**
     * Lấy giá trị total cuối cùng từ position có index cao nhất trong stage
     * Dùng để chốt sản lượng
     */
    async getFinalProductionCount(stageId: number): Promise<{ total: number; deviceId: string; timestamp: Date } | null> {
        this.logger.log(`📊 Getting final production count for stage ID: ${stageId}`);

        // Load stage với positions và devices
        const stage = await this.productionStageRepo.findOne({
            where: { id: stageId },
            relations: ['positions', 'positions.devices']
        });

        if (!stage) {
            throw new NotFoundException(`Stage with ID ${stageId} not found`);
        }

        if (!stage.positions || stage.positions.length === 0) {
            this.logger.warn(`   ⚠️ No positions found for stage ${stageId}`);
            return null;
        }

        // Tìm position có index cao nhất
        const maxPosition = stage.positions.reduce((max, pos) => 
            pos.index > max.index ? pos : max
        );

        this.logger.log(`   📍 Max position: ${maxPosition.name} (index=${maxPosition.index})`);

        if (!maxPosition.devices || maxPosition.devices.length === 0) {
            this.logger.warn(`   ⚠️ No devices found at position ${maxPosition.name}`);
            return null;
        }

        this.logger.log(`   🔧 Found ${maxPosition.devices.length} devices at position ${maxPosition.name}`);

        // Lấy tất cả measurements cuối cùng từ tất cả devices ở position này
        const deviceIds = maxPosition.devices.map(d => d.id);
        
        // Query latest measurement cho từng device
        const latestMeasurements = await Promise.all(
            maxPosition.devices.map(async (device) => {
                const measurement = await this.measurementRepo
                    .createQueryBuilder('m')
                    .where('m.device_id = :deviceId', { deviceId: device.id })
                    .orderBy('m.timestamp', 'DESC')
                    .limit(1)
                    .getOne();
                
                if (measurement) {
                    const total = measurement.data?.metrics?.total ?? measurement.data?.total ?? 0;
                    this.logger.log(`      • ${device.deviceId}: total=${total} at ${measurement.timestamp}`);
                    return { device, measurement, total };
                }
                return null;
            })
        );

        // Filter out null values
        const validMeasurements = latestMeasurements.filter(m => m !== null);

        if (validMeasurements.length === 0) {
            this.logger.warn(`   ⚠️ No measurements found for any device at position ${maxPosition.name}`);
            return null;
        }

        // Tính tổng total từ tất cả devices
        const totalSum = validMeasurements.reduce((sum, m) => sum + m.total, 0);
        
        // Lấy timestamp mới nhất
        const latestTimestamp = validMeasurements
            .map(m => m.measurement.timestamp)
            .reduce((latest, current) => current > latest ? current : latest);

        const deviceIdsList = validMeasurements.map(m => m.device.deviceId).join(', ');

        this.logger.log(`   ✅ Final count: ${totalSum} (sum from ${validMeasurements.length} devices: ${deviceIdsList})`);
        this.logger.log(`   📅 Latest measurement at: ${latestTimestamp}`);

        return {
            total: totalSum,
            deviceId: deviceIdsList, // Danh sách tất cả devices
            timestamp: latestTimestamp
        };
    }
}
