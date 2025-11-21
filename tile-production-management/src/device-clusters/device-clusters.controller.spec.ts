import { Test, TestingModule } from '@nestjs/testing';
import { DeviceClustersController } from './device-clusters.controller';

describe('DeviceClustersController', () => {
  let controller: DeviceClustersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeviceClustersController],
    }).compile();

    controller = module.get<DeviceClustersController>(DeviceClustersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
