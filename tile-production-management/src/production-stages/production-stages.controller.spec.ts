import { Test, TestingModule } from '@nestjs/testing';
import { ProductionStagesController } from './production-stages.controller';

describe('ProductionStagesController', () => {
  let controller: ProductionStagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionStagesController],
    }).compile();

    controller = module.get<ProductionStagesController>(ProductionStagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
