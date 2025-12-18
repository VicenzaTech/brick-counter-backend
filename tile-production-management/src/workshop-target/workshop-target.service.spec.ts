import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkshopTargetService } from './workshop-target.service';
import { WorkshopTarget } from './entities/workshop-target.entity';
import { Workshop } from 'src/workshops/entities/workshop.entity';
import { REDIS_PROVIDER } from 'src/common/redis/redis.constant';

const createRepositoryMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }),
});

describe('WorkshopTargetService', () => {
  let service: WorkshopTargetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkshopTargetService,
        { provide: getRepositoryToken(WorkshopTarget), useValue: createRepositoryMock() },
        { provide: getRepositoryToken(Workshop), useValue: createRepositoryMock() },
        {
          provide: REDIS_PROVIDER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkshopTargetService>(WorkshopTargetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
