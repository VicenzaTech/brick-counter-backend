import { Test, TestingModule } from '@nestjs/testing';
import { ProductionStageHistoryController } from './production-stage-history.controller';

describe('ProductionStageHistoryController', () => {
  let controller: ProductionStageHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionStageHistoryController],
    }).compile();

    controller = module.get<ProductionStageHistoryController>(ProductionStageHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
