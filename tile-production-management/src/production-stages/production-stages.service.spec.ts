import { Test, TestingModule } from '@nestjs/testing';
import { ProductionStagesService } from './production-stages.service';

describe('ProductionStagesService', () => {
  let service: ProductionStagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductionStagesService],
    }).compile();

    service = module.get<ProductionStagesService>(ProductionStagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
