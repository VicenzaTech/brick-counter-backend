import { Module } from '@nestjs/common';
import { PartitionManagerMinuteService } from './partition-manager.service';

@Module({
  providers: [PartitionManagerMinuteService]
})
export class PartitionManagerModule {}
