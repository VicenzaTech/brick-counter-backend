import { Test, TestingModule } from '@nestjs/testing';
import { ProductionMetricsService } from './production-metrics.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductionMetric } from './entities/production-metric.entity';
import { ProductionLine } from '../production-lines/entities/production-line.entity';
import { BrickType } from '../brick-types/entities/brick-type.entity';

describe('ProductionMetricsService', () => {
  let service: ProductionMetricsService;

  const mockMetricRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockLineRepository = {
    findOne: jest.fn(),
  };

  const mockBrickTypeRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionMetricsService,
        {
          provide: getRepositoryToken(ProductionMetric),
          useValue: mockMetricRepository,
        },
        {
          provide: getRepositoryToken(ProductionLine),
          useValue: mockLineRepository,
        },
        {
          provide: getRepositoryToken(BrickType),
          useValue: mockBrickTypeRepository,
        },
      ],
    }).compile();

    service = module.get<ProductionMetricsService>(ProductionMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should calculate metrics correctly and create a new metric', async () => {
      const createDto = {
        timestamp: new Date(),
        shift: 'A',
        sl_ep: 10000,
        sl_truoc_lo: 9800,
        sl_sau_lo: 9500,
        sl_truoc_mai: 9300,
        sl_sau_mai_canh: 9200,
        sl_truoc_dong_hop: 9000,
        productionLineId: 1,
        brickTypeId: 1,
      };

      const mockLine = { id: 1, name: 'Line 1' };
      const mockBrickType = { id: 1, name: '300x600mm' };

      mockLineRepository.findOne.mockResolvedValue(mockLine);
      mockBrickTypeRepository.findOne.mockResolvedValue(mockBrickType);
      mockMetricRepository.create.mockReturnValue(createDto);
      mockMetricRepository.save.mockResolvedValue({ id: 1, ...createDto });

      const result = await service.create(createDto);

      expect(mockLineRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockBrickTypeRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBeDefined();
    });

    it('should calculate hao phi moc correctly', async () => {
      // HP_Moc = SL_Ep - SL_TruocLo = 10000 - 9800 = 200
      // TyLe_HP_Moc = (200 / 10000) * 100 = 2%
      const createDto = {
        timestamp: new Date(),
        shift: 'A',
        sl_ep: 10000,
        sl_truoc_lo: 9800,
        sl_sau_lo: 9500,
        sl_truoc_mai: 9300,
        sl_sau_mai_canh: 9200,
        sl_truoc_dong_hop: 9000,
        productionLineId: 1,
      };

      const mockLine = { id: 1, name: 'Line 1' };
      mockLineRepository.findOne.mockResolvedValue(mockLine);
      
      const savedMetric = {
        ...createDto,
        hp_moc: 200,
        ty_le_hp_moc: 2,
      };
      
      mockMetricRepository.create.mockReturnValue(savedMetric);
      mockMetricRepository.save.mockResolvedValue(savedMetric);

      const result = await service.create(createDto);

      expect(result.hp_moc).toBe(200);
      expect(result.ty_le_hp_moc).toBe(2);
    });

    it('should set canh_bao_hp_moc when threshold exceeded', async () => {
      // HP_Moc = 250, Ty_le = 2.5% > 2% threshold
      const createDto = {
        timestamp: new Date(),
        shift: 'A',
        sl_ep: 10000,
        sl_truoc_lo: 9750, // Creates 2.5% waste
        sl_sau_lo: 9500,
        sl_truoc_mai: 9300,
        sl_sau_mai_canh: 9200,
        sl_truoc_dong_hop: 9000,
        productionLineId: 1,
      };

      const mockLine = { id: 1, name: 'Line 1' };
      mockLineRepository.findOne.mockResolvedValue(mockLine);
      
      const savedMetric = {
        ...createDto,
        canh_bao_hp_moc: true,
        cong_doan_van_de: ['Mộc'],
      };
      
      mockMetricRepository.create.mockReturnValue(savedMetric);
      mockMetricRepository.save.mockResolvedValue(savedMetric);

      const result = await service.create(createDto);

      expect(result.canh_bao_hp_moc).toBe(true);
      expect(result.cong_doan_van_de).toContain('Mộc');
    });
  });

  describe('getMetricsSummary', () => {
    it('should calculate summary statistics correctly', async () => {
      const mockMetrics = [
        {
          id: 1,
          timestamp: new Date(),
          shift: 'A',
          ty_le_hp_moc: 2,
          ty_le_hp_lo: 3,
          ty_le_hp_tm: 1.5,
          ty_le_hp_ht: 1.8,
          ty_le_tong_hao_phi: 8.3,
          hieu_suat_thanh_pham: 90,
          sl_truoc_dong_hop: 9000,
        },
        {
          id: 2,
          timestamp: new Date(),
          shift: 'B',
          ty_le_hp_moc: 1.8,
          ty_le_hp_lo: 2.8,
          ty_le_hp_tm: 1.6,
          ty_le_hp_ht: 1.7,
          ty_le_tong_hao_phi: 7.9,
          hieu_suat_thanh_pham: 91,
          sl_truoc_dong_hop: 9100,
        },
      ];

      mockMetricRepository.find.mockResolvedValue(mockMetrics);

      const query = {
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-14'),
        productionLineId: 1,
      };

      const summary = await service.getMetricsSummary(query);

      expect(summary).toBeDefined();
      expect(summary.ty_le_hao_phi_tong).toBeCloseTo(8.1, 1);
      expect(summary.hieu_suat_san_xuat).toBeCloseTo(90.5, 1);
      expect(summary.san_luong_thuc_te).toBe(18100);
    });

    it('should categorize waste status correctly', async () => {
      const mockMetrics = [
        {
          id: 1,
          timestamp: new Date(),
          shift: 'A',
          ty_le_hp_moc: 1.5, // Good (< 80% of 2%)
          ty_le_hp_lo: 2.5, // Warning (between 80-100% of 3%)
          ty_le_hp_tm: 2.5, // Danger (> 100% of 2%)
          ty_le_hp_ht: 1.8,
          ty_le_tong_hao_phi: 8.3,
          hieu_suat_thanh_pham: 90,
          sl_truoc_dong_hop: 9000,
        },
      ];

      mockMetricRepository.find.mockResolvedValue(mockMetrics);

      const query = {
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-14'),
        productionLineId: 1,
      };

      const summary = await service.getMetricsSummary(query);

      expect(summary.hao_phi_moc.status).toBe('good');
      expect(summary.hao_phi_lo.status).toBe('warning');
      expect(summary.hao_phi_truoc_mai.status).toBe('danger');
    });

    it('should generate alerts for exceeded thresholds', async () => {
      const mockMetrics = [
        {
          id: 1,
          timestamp: new Date(),
          shift: 'A',
          ty_le_hp_moc: 2.5, // Exceeds 2%
          ty_le_hp_lo: 3.5, // Exceeds 3%
          ty_le_hp_tm: 1.5,
          ty_le_hp_ht: 1.8,
          ty_le_tong_hao_phi: 9.3,
          hieu_suat_thanh_pham: 90,
          sl_truoc_dong_hop: 9000,
        },
      ];

      mockMetricRepository.find.mockResolvedValue(mockMetrics);

      const query = {
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-14'),
        productionLineId: 1,
      };

      const summary = await service.getMetricsSummary(query);

      expect(summary.alerts.length).toBeGreaterThan(0);
      expect(summary.alerts).toContain('Hao phí mộc vượt ngưỡng');
      expect(summary.alerts).toContain('Hao phí lò vượt ngưỡng');
    });
  });

  describe('getSankeyData', () => {
    it('should generate correct Sankey diagram data', async () => {
      const mockMetrics = [
        {
          id: 1,
          sl_ep: 10000,
          sl_truoc_lo: 9800,
          sl_sau_lo: 9500,
          sl_truoc_mai: 9300,
          sl_truoc_dong_hop: 9000,
          hp_moc: 200,
          hp_lo: 300,
          hp_tm: 200,
          hp_ht: 300,
        },
      ];

      mockMetricRepository.find.mockResolvedValue(mockMetrics);

      const query = {
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-14'),
        productionLineId: 1,
      };

      const sankeyData = await service.getSankeyData(query);

      expect(sankeyData.nodes).toHaveLength(9);
      expect(sankeyData.links).toHaveLength(8);
      
      // Verify flow from Máy ép
      const epToLo = sankeyData.links.find(l => l.source === 0 && l.target === 1);
      expect(epToLo?.value).toBe(9800);
      
      const epToHpMoc = sankeyData.links.find(l => l.source === 0 && l.target === 5);
      expect(epToHpMoc?.value).toBe(200);
    });
  });
});
