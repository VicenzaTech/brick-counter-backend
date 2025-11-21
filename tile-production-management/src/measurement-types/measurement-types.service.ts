import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeasurementType } from './entities/measurement-types.entity';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import { CreateMeasurementTypeDto } from './dtos/create-measurement-type.dto';
import { UpdateMeasurementTypeDto } from './dtos/update-measurement-type.dto';
import Ajv from 'ajv';

@Injectable()
export class MeasurementTypesService {
    private readonly ajv = new Ajv({ allErrors: true });

    constructor(
        @InjectRepository(MeasurementType)
        private readonly measurementTypeRepository: Repository<MeasurementType>,
        @InjectRepository(DeviceCluster)
        private readonly deviceClusterRepository: Repository<DeviceCluster>,
    ) { }

    private validateSchemaOrThrow(schema: Record<string, any>) {
        try {
            this.ajv.compile(schema);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Invalid JSON schema';
            throw new BadRequestException(`data_schema is not a valid JSON Schema: ${msg}`);
        }
    }

    async create(dto: CreateMeasurementTypeDto): Promise<MeasurementType> {
        this.validateSchemaOrThrow(dto.data_schema);

        const existing = await this.measurementTypeRepository.findOne({
            where: { code: dto.code },
        });

        if (existing) {
            throw new ConflictException(
                `Measurement type with code "${dto.code}" already exists`,
            );
        }

        const measurementType = this.measurementTypeRepository.create({
            ...dto,
            data_schema_version: dto.data_schema_version ?? 1,
        });

        return this.measurementTypeRepository.save(measurementType);
    }

    async findAll(): Promise<MeasurementType[]> {
        return this.measurementTypeRepository.find({
            relations: ['clusters'],
            order: { id: 'ASC' },
        });
    }

    async findOne(id: number): Promise<MeasurementType> {
        const mt = await this.measurementTypeRepository.findOne({
            where: { id },
            relations: ['clusters'],
        });

        if (!mt) {
            throw new NotFoundException(`Measurement type with ID ${id} not found`);
        }

        return mt;
    }

    async update(
        id: number,
        dto: UpdateMeasurementTypeDto,
    ): Promise<MeasurementType> {
        const mt = await this.findOne(id);

        if (dto.code && dto.code !== mt.code) {
            const existing = await this.measurementTypeRepository.findOne({
                where: { code: dto.code },
            });

            if (existing && existing.id !== id) {
                throw new ConflictException(
                    `Measurement type with code "${dto.code}" already exists`,
                );
            }
        }

        if (dto.data_schema) {
            this.validateSchemaOrThrow(dto.data_schema);
        }

        Object.assign(mt, dto);

        return this.measurementTypeRepository.save(mt);
    }

    async remove(id: number): Promise<void> {
        const mt = await this.findOne(id);

        const clusterCount = await this.deviceClusterRepository.count({
            where: { measurementType: { id } },
        });

        if (clusterCount > 0) {
            throw new ConflictException(
                `Cannot delete measurement type ID ${id} because ${clusterCount} device cluster(s) are using it`,
            );
        }

        await this.measurementTypeRepository.remove(mt);
    }
}
