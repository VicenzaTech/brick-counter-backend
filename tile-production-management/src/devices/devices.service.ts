import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from './entities/device.entity';
import { DeviceTelemetry } from './entities/device-telemetry.entity';
import { Position } from '../positions/entities/position.entity';
import { CreateDeviceDto } from './dtos/create-device.dto';
import { UpdateDeviceDto } from './dtos/update-device.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private deviceRepository: Repository<Device>,
    @InjectRepository(DeviceTelemetry)
    private telemetryRepository: Repository<DeviceTelemetry>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
  ) {}

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

    const device = this.deviceRepository.create({
      ...createDeviceDto,
      position,
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

    // If positionId is being updated, validate it exists
    if (updateDeviceDto.positionId) {
      const position = await this.positionRepository.findOne({
        where: { id: updateDeviceDto.positionId },
      });

      if (!position) {
        throw new NotFoundException(
          `Position with ID ${updateDeviceDto.positionId} not found`,
        );
      }
    }

    Object.assign(device, updateDeviceDto);
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
}
