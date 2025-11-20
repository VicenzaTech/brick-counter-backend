import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceExtraInfo } from './entities/device.entity';
import { DeviceTelemetry } from './entities/device-telemetry.entity';
import { Position } from '../positions/entities/position.entity';
import { CreateDeviceDto } from './dtos/create-device.dto';
import { UpdateDeviceDto } from './dtos/update-device.dto';

export const get_device_topic = (deviceId: string): string =>
    `devices/${deviceId}/telemetry`;

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
        // Check if position exists
        const position = await this.positionRepository.findOne({
            where: { id: createDeviceDto.positionId },
        });

        if (!position) {
            throw new NotFoundException(
                `Position with ID ${createDeviceDto.positionId} not found`,
            );
        }

        const extraInfo: DeviceExtraInfo = {
            interval_message_time: createDeviceDto.interval_message_time ?? 60,
            sub_topic: get_device_topic(createDeviceDto.device_id),
            qosDefault: createDeviceDto.qosDefault ?? 1
        };

        const device = this.deviceRepository.create({
            deviceId: createDeviceDto.device_id,
            name: createDeviceDto.name,
            type: createDeviceDto.type,
            serial_number: createDeviceDto.serial_number,
            installation_date: createDeviceDto.installation_date,
            status: createDeviceDto.status ?? 'offline',
            last_maintenance: createDeviceDto.last_maintenance,
            position,
            extraInfo,
        });
        return await this.deviceRepository.save(device);
    }

    async findAll(): Promise<Device[]> {
        return await this.deviceRepository.find({
            relations: ['position', 'productions', 'maintenances'],
        });
    }

    async findOne(id: number): Promise<Device> {
        const device = await this.deviceRepository.findOne({
            where: { id },
            relations: ['position', 'productions', 'maintenances'],
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

        if (updateDeviceDto.device_id) {
            device.deviceId = updateDeviceDto.device_id;
        }

        // Cập nhật extraInfo
        const extraInfo: DeviceExtraInfo = {
            ...(device.extraInfo || {}),
        };

        if (updateDeviceDto.interval_message_time !== undefined) {
            extraInfo.interval_message_time = updateDeviceDto.interval_message_time;
        }

        if (updateDeviceDto.qosDefault !== undefined) {
            extraInfo.qosDefault = updateDeviceDto.qosDefault
        }

        if (device.deviceId) {
            extraInfo.sub_topic = get_device_topic(device.deviceId);
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
        if (updateDeviceDto.status !== undefined) {
            device.status = updateDeviceDto.status;
        }
        if (updateDeviceDto.last_maintenance !== undefined) {
            device.last_maintenance = updateDeviceDto.last_maintenance;
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
    // check product topic alive


    /**
     * Reset Devices
     * */
    async resetDevices(deviceId: string) {
        const foundDevice = await this.deviceRepository.exists({
            where: {
                deviceId: deviceId
            }
        })

        if (!foundDevice) throw new BadGatewayException('Device not exist')

        // mqtt call
    
        return true
    }

    /**
     * Reset Counter Devices 
     * */

    async resetCounterDevices(deviceId: string) {
        const foundDevice = await this.deviceRepository.exists({
            where: {
                deviceId: deviceId
            }
        })

        if (!foundDevice) throw new BadGatewayException('Device not exist')
        
        // mqtt call

        return true
    }
}
