import { Module } from '@nestjs/common';
import { InternalApiController } from './internal-api.controller';
import { DevicesModule } from 'src/devices/devices.module';
import { MeasurementTypesModule } from 'src/measurement-types/measurement-types.module';
import { PositionsModule } from 'src/positions/positions.module';
import { ProductionLinesModule } from 'src/production-lines/production-lines.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [
        DevicesModule,
        MeasurementTypesModule,
        PositionsModule,
        ProductionLinesModule,
        AuthModule,
    ],
    controllers: [InternalApiController],
})
export class InternalApiModule { }

