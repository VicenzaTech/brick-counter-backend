import { Test, TestingModule } from '@nestjs/testing';
import { RunsAnalyticsService } from './runs-analytics.service';

describe('RunsAnalyticsService', () => {
  let service: RunsAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RunsAnalyticsService],
    }).compile();

    service = module.get<RunsAnalyticsService>(RunsAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
