import { Test, TestingModule } from '@nestjs/testing';
import { PartitionManagerService } from './partition-manager.service';

describe('PartitionManagerService', () => {
  let service: PartitionManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PartitionManagerService],
    }).compile();

    service = module.get<PartitionManagerService>(PartitionManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
