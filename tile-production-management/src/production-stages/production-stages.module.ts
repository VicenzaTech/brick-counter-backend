import { Module } from '@nestjs/common';
import { ProductionStagesService } from './production-stages.service';
import { ProductionStagesController } from './production-stages.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionStage } from './entities/production-stage.entity';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { Position } from '../positions/entities/position.entity';
import { ActivityLogModule } from 'src/activity-log/activity-log.module';
import { BrickType } from 'src/brick-types/entities/brick-type.entity';
import { ConfigService } from '@nestjs/config/dist/config.service';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { UsersModule } from 'src/users/users.module';
import { DeviceCluster } from 'src/device-clusters/entities/device-cluster.entity';
import { Measurement } from '../measurement/entities/measurement.entity';
import { Device } from '../devices/entities/device.entity';
import { ProductionStageHistoryModule } from '../production-stage-history/production-stage-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductionStage, ProductionLine, Position, BrickType, DeviceCluster, Measurement, Device]),
    ActivityLogModule,
    ProductionStageHistoryModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const JWT_ACCESS_SECRET = configService.get<string>('JWT_ACCESS_SECRET')
        const JWT_ACCESS_EXPIRES = configService.get<string>('JWT_ACCESS_EXPIRES')

                return {
                    global: true,
                    secret: JWT_ACCESS_SECRET,
                    signOptions: {
                        expiresIn: JWT_ACCESS_EXPIRES as any
                    }
                }
            },
            inject: [ConfigService]
        }),
        UsersModule,
    ],
    controllers: [ProductionStagesController],
    providers: [ProductionStagesService],
    exports: [ProductionStagesService]
})
export class ProductionStagesModule { }
