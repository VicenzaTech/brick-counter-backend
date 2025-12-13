import { Test, TestingModule } from '@nestjs/testing';
import { RunsAnalyticsController } from './runs-analytics.controller';

describe('RunsAnalyticsController', () => {
  let controller: RunsAnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RunsAnalyticsController],
    }).compile();

    controller = module.get<RunsAnalyticsController>(RunsAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
