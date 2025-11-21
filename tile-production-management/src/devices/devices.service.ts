import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { DeviceTelemetry } from './entities/device-telemetry.entity';
import { Position } from '../positions/entities/position.entity';
import { CreateDeviceDto } from './dtos/create-device.dto';
import { UpdateDeviceDto } from './dtos/update-device.dto';
import type { DeviceExtraInfo } from 'src/common/mqtt/device-extra-info';

export const get_device_topic = (deviceId: string): string =>
    `devices/${deviceId}/telemetry`;

const DEVICE_ID_TOPIC_KEY = '{deviceId}'
@Injectable()
export class DevicesService {
    constructor(
        @InjectRepository(Device)
        private deviceRepository: Repository<Device>,
        @InjectRepository(DeviceTelemetry)
        private telemetryRepository: Repository<DeviceTelemetry>,
        @InjectRepository(Position)
        private positionRepository: Repository<Position>,
    ) { }

    async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
        const deviceId = createDeviceDto.deviceId ?? createDeviceDto.device_id;
        if (!deviceId) {
            throw new BadGatewayException('deviceId is required');
        }

        // Check if position exists
        const position = await this.positionRepository.findOne({
            where: { id: createDeviceDto.positionId },
        });

        if (!position) {
            throw new NotFoundException(
                `Position with ID ${createDeviceDto.positionId} not found`,
            );
        }

        const commands = createDeviceDto.commands
        if (commands) {
            const mappingCmd: typeof commands = commands.map((cmd) => ({
                ...cmd,
                topic: cmd.topic.replace(DEVICE_ID_TOPIC_KEY, deviceId)
            }))

            createDeviceDto.commands = mappingCmd
        }

        if (createDeviceDto.telemetryTopic) {
            createDeviceDto.telemetryTopic = createDeviceDto.telemetryTopic.replace(DEVICE_ID_TOPIC_KEY, deviceId)
        }

        const extraInfo: DeviceExtraInfo = {
            interval_message_time: createDeviceDto.interval_message_time ?? 60,
            telemetry: {
                topic: createDeviceDto.telemetryTopic?.replace(DEVICE_ID_TOPIC_KEY, deviceId) ?? get_device_topic(deviceId),
                qos: createDeviceDto.qosDefault ?? 1,
            },
            commands: createDeviceDto.commands,
            other: createDeviceDto.other,
        };

        const device = this.deviceRepository.create({
            deviceId,
            name: createDeviceDto.name,
            type: createDeviceDto.type,
            serial_number: createDeviceDto.serial_number,
            installation_date: createDeviceDto.installation_date,
            status: 'offline',
            position,
            extraInfo,
        });
        return await this.deviceRepository.save(device);
    }

    async findAll(): Promise<Device[]> {
        return await this.deviceRepository.find({
            relations: ['position'],
        });
    }

    async findOne(id: number): Promise<Device> {
        const device = await this.deviceRepository.findOne({
            where: { id },
            relations: ['position'],
        });

        if (!device) {
            throw new NotFoundException(`Device with ID ${id} not found`);
        }

        return device;
    }

    async update(
        id: number,
        updateDeviceDto: UpdateDeviceDto,
    ): Promise<Device> {
        const device = await this.findOne(id);

        // If positionId is being updated, validate it exists and update relation
        if (updateDeviceDto.positionId) {
            const position = await this.positionRepository.findOne({
                where: { id: updateDeviceDto.positionId },
            });

            if (!position) {
                throw new NotFoundException(
                    `Position with ID ${updateDeviceDto.positionId} not found`,
                );
            }

            device.position = position;
        }

        if (updateDeviceDto.deviceId || updateDeviceDto.device_id) {
            device.deviceId = updateDeviceDto.deviceId ?? updateDeviceDto.device_id!;
            if (!updateDeviceDto.telemetryTopic) {
                // ensure extraInfo and telemetry objects exist before assigning to telemetry.topic
                device.extraInfo = device.extraInfo ?? {};
                device.extraInfo.telemetry = device.extraInfo.telemetry ?? { topic: '' };
                device.extraInfo.telemetry.topic = get_device_topic(device.deviceId);
            }
        }

        // Cập nhật extraInfo
        const extraInfo: DeviceExtraInfo = {
            ...(device.extraInfo || {}),
        };

        if (updateDeviceDto.interval_message_time !== undefined) {
            extraInfo.interval_message_time = updateDeviceDto.interval_message_time;
        }

        if (updateDeviceDto.qosDefault !== undefined) {
            if (!extraInfo.telemetry) {
                extraInfo.telemetry = { topic: get_device_topic(device.deviceId) };
            }
            extraInfo.telemetry.qos = updateDeviceDto.qosDefault;
        }

        if (updateDeviceDto.telemetryTopic !== undefined) {
            if (!extraInfo.telemetry) {
                extraInfo.telemetry = { topic: '' };
            }
            extraInfo.telemetry.topic =
                updateDeviceDto.telemetryTopic.replace(DEVICE_ID_TOPIC_KEY, device.deviceId) || get_device_topic(device.deviceId).replace(DEVICE_ID_TOPIC_KEY, device.deviceId);
        } else if (device.deviceId) {
            if (!extraInfo.telemetry) {
                extraInfo.telemetry = { topic: '' };
            }
            extraInfo.telemetry.topic = get_device_topic(device.deviceId);
        }

        const commands = updateDeviceDto.commands
        if (commands) {
            const mappingCmd: typeof commands = commands.map((cmd) => ({
                ...cmd,
                topic: cmd.topic.replace(DEVICE_ID_TOPIC_KEY, device.deviceId)
            }))

            extraInfo.commands = mappingCmd
        }

        if (updateDeviceDto.other !== undefined) {
            extraInfo.other = updateDeviceDto.other;
        }

        device.extraInfo = extraInfo;

        if (updateDeviceDto.name !== undefined) {
            device.name = updateDeviceDto.name;
        }
        if (updateDeviceDto.type !== undefined) {
            device.type = updateDeviceDto.type;
        }
        if (updateDeviceDto.serial_number !== undefined) {
            device.serial_number = updateDeviceDto.serial_number;
        }
        if (updateDeviceDto.installation_date !== undefined) {
            device.installation_date = updateDeviceDto.installation_date;
        }
        return await this.deviceRepository.save(device);
    }

    async remove(id: number): Promise<void> {
        const device = await this.findOne(id);
        await this.deviceRepository.remove(device);
    }

    /**
     * Get latest telemetry for all devices from database
     */
    async getLatestTelemetry(): Promise<DeviceTelemetry[]> {
        return await this.telemetryRepository.find({
            relations: ['position'],
            order: {
                lastMessageAt: 'DESC',
            },
        });
    }

    /**
     * Get latest telemetry for a specific device from database
     */
    async getDeviceLatestTelemetry(deviceId: string): Promise<DeviceTelemetry | null> {
        const telemetry = await this.telemetryRepository.findOne({
            where: { deviceId },
            relations: ['position'],
        });

        if (!telemetry) {
            return null;
        }
        return telemetry;
    }

    /**
     * Đếm số thiết bị thuộc về một device_cluster (theo clusterId).
     * Dùng cho các ràng buộc khi xóa cluster.
     */
    async countDevicesByClusterId(clusterId: number): Promise<number> {
        return this.deviceRepository.count({
            where: { clusterId },
        });
    }
    // check product topic alive


    async checkDeviceOnline(id: number) {
        let foundDevice = await this.deviceRepository.findOneOrFail({
            where: {
                id
            }
        })
        if (!foundDevice) throw new NotFoundException('Device is not exist')

        const subTopic = foundDevice.extraInfo?.telemetry?.topic
        // wait for mqtt response
        const isAlive = true

        if (isAlive !== (foundDevice.status == 'online')) {
            foundDevice.status = isAlive ? 'online' : 'offline'
            foundDevice = await this.deviceRepository.save(foundDevice)
        }

        return isAlive
    }
}
