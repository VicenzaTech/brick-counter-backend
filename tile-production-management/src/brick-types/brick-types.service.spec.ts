import { Test, TestingModule } from '@nestjs/testing';
import { BrickTypesService } from './brick-types.service';

describe('BrickTypesService', () => {
  let service: BrickTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BrickTypesService],
    }).compile();

    service = module.get<BrickTypesService>(BrickTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
