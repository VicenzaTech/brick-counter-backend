import { Test, TestingModule } from '@nestjs/testing';
import { DeviceClustersService } from './device-clusters.service';

describe('DeviceClustersService', () => {
  let service: DeviceClustersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceClustersService],
    }).compile();

    service = module.get<DeviceClustersService>(DeviceClustersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
