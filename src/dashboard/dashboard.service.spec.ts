import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrisma = {
    financialRecord: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return computed financial summary', async () => {
      mockPrisma.financialRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(10000) } })
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(3000) } });
      mockPrisma.financialRecord.count.mockResolvedValue(15);

      const result = await service.getSummary();

      expect(result.totalIncome).toBe(10000);
      expect(result.totalExpenses).toBe(3000);
      expect(result.netBalance).toBe(7000);
      expect(result.recordCount).toBe(15);
    });

    it('should handle zero records gracefully', async () => {
      mockPrisma.financialRecord.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });
      mockPrisma.financialRecord.count.mockResolvedValue(0);

      const result = await service.getSummary();

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.netBalance).toBe(0);
      expect(result.recordCount).toBe(0);
    });
  });

  describe('getByCategory', () => {
    it('should return category breakdown', async () => {
      mockPrisma.financialRecord.groupBy.mockResolvedValue([
        {
          category: 'Salary',
          type: 'INCOME',
          _sum: { amount: new Prisma.Decimal(5000) },
          _count: { id: 3 },
        },
        {
          category: 'Rent',
          type: 'EXPENSE',
          _sum: { amount: new Prisma.Decimal(1500) },
          _count: { id: 2 },
        },
      ]);

      const result = await service.getByCategory();

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Salary');
      expect(result[0].total).toBe(5000);
      expect(result[1].category).toBe('Rent');
    });
  });

  describe('getRecent', () => {
    it('should return recent records', async () => {
      const mockRecords = [
        { id: '1', amount: 100, category: 'Food' },
        { id: '2', amount: 200, category: 'Transport' },
      ];
      mockPrisma.financialRecord.findMany.mockResolvedValue(mockRecords);

      const result = await service.getRecent();

      expect(result).toHaveLength(2);
      expect(mockPrisma.financialRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });
});
