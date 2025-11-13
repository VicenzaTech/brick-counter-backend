import { Test, TestingModule } from '@nestjs/testing';
import { BrickTypesController } from './brick-types.controller';

describe('BrickTypesController', () => {
  let controller: BrickTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrickTypesController],
    }).compile();

    controller = module.get<BrickTypesController>(BrickTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
