import { Test, TestingModule } from '@nestjs/testing';
import { WorkshopTargetController } from './workshop-target.controller';
import { WorkshopTargetService } from './workshop-target.service';

describe('WorkshopTargetController', () => {
  let controller: WorkshopTargetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkshopTargetController],
      providers: [
        {
          provide: WorkshopTargetService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkshopTargetController>(WorkshopTargetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
