import { Test, TestingModule } from '@nestjs/testing';
import { MeasurementTypesService } from './measurement-types.service';

describe('MeasurementTypesService', () => {
  let service: MeasurementTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeasurementTypesService],
    }).compile();

    service = module.get<MeasurementTypesService>(MeasurementTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
