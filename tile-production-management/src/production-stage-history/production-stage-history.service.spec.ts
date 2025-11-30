import { Test, TestingModule } from '@nestjs/testing';
import { ProductionStageHistoryService } from './production-stage-history.service';

describe('ProductionStageHistoryService', () => {
  let service: ProductionStageHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductionStageHistoryService],
    }).compile();

    service = module.get<ProductionStageHistoryService>(ProductionStageHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
