import { Test, TestingModule } from '@nestjs/testing';
import { ProductionLinesController } from './production-lines.controller';

describe('ProductionLinesController', () => {
  let controller: ProductionLinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionLinesController],
    }).compile();

    controller = module.get<ProductionLinesController>(ProductionLinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
