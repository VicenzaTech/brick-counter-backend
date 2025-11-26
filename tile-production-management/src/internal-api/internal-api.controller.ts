import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DevicesService } from 'src/devices/devices.service';
import { MeasurementTypesService } from 'src/measurement-types/measurement-types.service';
import { PositionsService } from 'src/positions/positions.service';
import { ProductionLinesService } from 'src/production-lines/production-lines.service';
import { ServerAuthGuard } from 'src/auth/guard/server/server-auth.guard';

@Controller('internal-api')
@UseGuards(ServerAuthGuard)
export class InternalApiController {
    constructor(
        private readonly devicesService: DevicesService,
        private readonly measurementTypesService: MeasurementTypesService,
        private readonly positionsService: PositionsService,
        private readonly productionLinesService: ProductionLinesService,
    ) { }

    @Get('health')
    health() {
        return { status: 'ok' };
    }

    @Get('devices')
    async getAllDevices() {
        const devices = await this.devicesService.findAll();
        return devices.map((d) => ({
            id: d.id,
            deviceId: d.deviceId,
            name: d.name,
            positionId: d.position ? d.position.id : null,
        }));
    }

    @Get('devices/by-device-id/:deviceId')
    async getDeviceByDeviceId(@Param('deviceId') deviceId: string) {
        const devices = await this.devicesService.findAll();
        const device = devices.find((d) => d.deviceId === deviceId);
        return device
            ? {
                id: device.id,
                deviceId: device.deviceId,
                name: device.name,
                positionId: device.position ? device.position.id : null,
            }
            : null;
    }

    @Get('measurement-types')
    async getAllMeasurementTypes() {
        const types = await this.measurementTypesService.findAll();
        return types.map((t) => ({
            id: t.id,
            code: t.code,
            name: t.name,
        }));
    }

    @Get('measurement-types/:id')
    async getMeasurementType(@Param('id') id: string) {
        const mt = await this.measurementTypesService.findOne(+id);
        return {
            id: mt.id,
            code: mt.code,
            name: mt.name,
        };
    }

    @Get('positions')
    async getAllPositions() {
        const positions = await this.positionsService.findAll();
        return positions.map((p) => ({
            id: p.id,
            name: p.name,
            productionLineId: p.productionLine?.id,
            index: p.index,
        }));
    }

    @Get('positions/:id')
    async getPosition(@Param('id') id: string) {
        const p = await this.positionsService.findOne(+id);
        return {
            id: p.id,
            name: p.name,
            productionLineId: p.productionLine?.id,
            index: p.index,
        };
    }

    @Get('production-lines/:id')
    async getProductionLine(@Param('id') id: string) {
        const line = await this.productionLinesService.findOne(+id);
        return {
            id: line.id,
            name: line.name,
            status: line.status,
        };
    }
}

