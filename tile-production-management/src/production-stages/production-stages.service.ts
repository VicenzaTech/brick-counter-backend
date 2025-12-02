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
import { ProductionStageHistoryService } from 'src/production-stage-history/production-stage-history.service';
import { StopReason, ProductionStageHistory } from 'src/production-stage-history/entities/production-stage-history.entity';

type DeviceSummary = {
    id: number;
    deviceId: string;
    name: string;
    position?: number;
};

export interface ProductionLineStagesResponse {
    stages: ProductionStage[];
    stageDeviceMap: Record<number, Record<number, DeviceSummary[]>>;
}

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

        @InjectRepository(ProductionStageHistory)
        private readonly historyRepo: Repository<ProductionStageHistory>,

        private readonly activityLogService: ActivityLogService,
        private readonly mqttService: SimpleUniversalMqttService,
        private readonly mqttHandler: SimpleUniversalHandler,
        private readonly productionStageHistoryService: ProductionStageHistoryService,
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

    async findStagesByProductionLine(productionLineId: number): Promise<ProductionLineStagesResponse> {
        const stages = await this.productionStageRepo
            .createQueryBuilder('stage')
            .leftJoinAndSelect('stage.productionLine', 'productionLine')
            .leftJoinAndSelect('stage.positions', 'positions')
            .leftJoinAndSelect('positions.devices', 'devices')
            .where('stage.productionLineId = :productionLineId', { productionLineId })
            .orderBy('stage.order', 'ASC')
            .addOrderBy('positions.index', 'ASC')
            .getMany();

        // Fetch startTime from latest running history (endTime IS NULL)
        const stagesWithStartTime = await Promise.all(
            stages.map(async (stage) => {
                try {
                    const runningHistory = await this.productionStageHistoryService.getLatestStageHistory(stage.id);
                    return {
                        ...stage,
                        startTime: runningHistory?.startTime || null,
                    };
                } catch (error) {
                    this.logger.warn(`Failed to fetch history for stage ${stage.id}: ${error.message}`);
                    return {
                        ...stage,
                        startTime: null,
                    };
                }
            })
        );

        // Changed to flat structure: { productionLineId: { stageId: DeviceSummary[] } }
        // Frontend will extract the inner { stageId: DeviceSummary[] } object
        const stageDeviceMap: Record<number, Record<number, DeviceSummary[]>> = {};

        for (const stage of stagesWithStartTime) {
            // Flatten all devices from all positions into a single array per stage
            const allDevices: DeviceSummary[] = [];
            for (const position of stage.positions || []) {
                for (const device of position.devices || []) {
                    allDevices.push({
                        id: device.id,
                        deviceId: device.deviceId,
                        name: device.name,
                        position: position.index, // Add position index
                    });
                }
            }
            
            // Store devices array directly under productionLineId -> stageId
            if (!stageDeviceMap[productionLineId]) {
                stageDeviceMap[productionLineId] = {};
            }
            stageDeviceMap[productionLineId][stage.id] = allDevices;
        }

        return { stages: stagesWithStartTime, stageDeviceMap };
    }

    async updateStatus(updateStatusDto: UpdateProductionStageStatusDto, user?: User): Promise<ProductionStage> {
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

        const historyProductId = updateStatusDto.productId ?? stage.productId;
        const historyTimestamp = new Date();
        const userName = user?.username ?? 'system';

        let productName = '';
        let resolvedBrickType: BrickType | null = null;
        if (historyProductId) {
            resolvedBrickType = await this.brickTypeRepo.findOne({ where: { id: historyProductId } });
            productName = resolvedBrickType ? resolvedBrickType.name : `${historyProductId}`;
        }

        const logDto = new LogDTO();
        logDto.action = 'UPDATE';
        logDto.userId = user?.id;

        let latestHistory = await this.productionStageHistoryService.getLatestStageHistory(stage.id);

        if (updateStatusDto.status === 'running' && stage.status !== 'running') {
            if (latestHistory && !latestHistory.endTime) {
                await this.productionStageHistoryService.update(latestHistory.id, {
                    endTime: historyTimestamp,
                    createdByUsername: userName,
                });
            }
            const runningNotes = this.buildHistoryNotes('running', stage.name, userName, updateStatusDto.notes);
            await this.productionStageHistoryService.create({
                stageId: stage.id,
                productId: historyProductId,
                productionLineId: stage.productionLineId,
                startTime: historyTimestamp,
                notes: runningNotes,
                createdByUsername: userName,
            });
        } else if (updateStatusDto.status === 'waiting_log') {
            if (!latestHistory || latestHistory.endTime) {
                latestHistory = await this.productionStageHistoryService.create({
                    stageId: stage.id,
                    productId: historyProductId,
                    productionLineId: stage.productionLineId,
                    startTime: historyTimestamp,
                    createdByUsername: userName,
                });
            }
            const stopReason = updateStatusDto.stopReason ?? StopReason.MANUAL_STOP;
            const waitingNotes = this.buildHistoryNotes('waiting_log', stage.name, userName, updateStatusDto.notes, stopReason);
            const waitingUpdate: any = {
                endTime: historyTimestamp,
                stopReason,
                notes: waitingNotes,
                createdByUsername: userName,
            };
            const waitingProductId = historyProductId ?? latestHistory.productId;
            if (waitingProductId !== undefined) {
                waitingUpdate.productId = waitingProductId;
            }
            await this.productionStageHistoryService.update(latestHistory.id, waitingUpdate);
        } else if (updateStatusDto.status === 'pending') {
            if (!latestHistory || latestHistory.endTime) {
                latestHistory = await this.productionStageHistoryService.create({
                    stageId: stage.id,
                    productId: historyProductId,
                    productionLineId: stage.productionLineId,
                    startTime: historyTimestamp,
                    createdByUsername: userName,
                });
            }
            const finalCount = await this.getFinalProductionCount(stage.id);
            const quantity = finalCount?.total ?? 0;
            const area = this.calculateAreaFromSpecs(quantity, resolvedBrickType?.specs);
            const endTime = finalCount?.timestamp ?? historyTimestamp;
            const pendingNotes = this.buildHistoryNotes('pending', stage.name, userName, updateStatusDto.notes, StopReason.END, quantity, area);
            const pendingUpdate: any = {
                endTime,
                stopReason: StopReason.END,
                quantity,
                area,
                notes: pendingNotes,
                createdByUsername: userName,
            };
            const pendingProductId = historyProductId ?? latestHistory.productId;
            if (pendingProductId !== undefined) {
                pendingUpdate.productId = pendingProductId;
            }
            await this.productionStageHistoryService.update(latestHistory.id, pendingUpdate);
        } else if (stage.status === 'running' && updateStatusDto.status !== 'running') {
            if (latestHistory && !latestHistory.endTime) {
                const genericNotes = this.buildHistoryNotes(updateStatusDto.status, stage.name, userName, updateStatusDto.notes);
                await this.productionStageHistoryService.update(latestHistory.id, {
                    endTime: historyTimestamp,
                    notes: genericNotes,
                    createdByUsername: userName,
                });
            }
        }

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

    async getProductionStagesByProductionLineId(productionLineId: number): Promise<ProductionLineStagesResponse> {
        const response = await this.findStagesByProductionLine(productionLineId);

        if (!response.stages || response.stages.length === 0) {
            throw new NotFoundException(`No production stages found for production line ID: ${productionLineId}`);
        }

        return response;
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
                this.logger.log(`   🔧 measurement `, measurement);

                if (measurement) {
                    const parseData = typeof measurement?.data === 'string' ? JSON.parse(measurement.data) : measurement.data;
                    const total = parseData?.metrics?.total ?? parseData?.total ?? 0;
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
        this.logger.log(`   ✅ latestMeasurements`, latestMeasurements, ` | validMeasurements count: ${validMeasurements.length}`);

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

    private buildHistoryNotes(
        status: string,
        stageName: string,
        userName: string,
        customNotes?: string,
        stopReason?: StopReason,
        quantity?: number,
        area?: number,
    ): string | undefined {
        if (customNotes && customNotes.trim().length > 0) {
            return customNotes;
        }

        switch (status) {
            case 'running':
                return `Chạy công đoạn ${stageName}`;
            case 'waiting_log':
                return `Tạm dừng công đoạn ${stageName} (${this.getStopReasonLabel(stopReason)}).`;
            case 'pending':
                if (typeof quantity === 'number' && quantity >= 0) {
                    const areaText = typeof area === 'number' ? `, dien tich ~${area} m2` : '';
                    return `Chốt công đoạn ${stageName}, sản lượng ${quantity}-${areaText}.`;
                }
                return `Cập nhật công đoạn ${stageName} về trạng thái chờ.`;
            default:
                return undefined;
        }
    }

    private getStopReasonLabel(reason?: StopReason): string {
        switch (reason) {
            case StopReason.MANUAL_STOP:
                return 'Dừng thủ công';
            case StopReason.END:
                return 'Kết thúc ca';
            case StopReason.MACHINE_ERROR:
                return 'Lỗi máy';
            case StopReason.CHANGE_PRODUCT:
                return 'Đổi sản phẩm';
            case StopReason.SHIFT_END:
                return 'Kết thúc ca sản xuất';
            case StopReason.MAINTENANCE:
                return 'Bảo trì';
            case StopReason.OTHER:
                return 'Khác';
            default:
                return 'Không xác định';
        }
    }

    private calculateAreaFromSpecs(quantity: number, specs?: any): number | undefined {
        if (quantity <= 0) {
            return 0;
        }

        if (!specs) {
            return undefined;
        }

        const width = Number(specs.width);
        const height = Number(specs.height);

        if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
            return undefined;
        }

        const tileArea = (width / 1000) * (height / 1000);
        const totalArea = quantity * tileArea;
        return Math.round(totalArea * 100) / 100;
    }

}
