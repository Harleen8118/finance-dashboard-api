import { Test, TestingModule } from '@nestjs/testing';
import { RecordsService } from './records.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';

describe('RecordsService', () => {
  let service: RecordsService;
  let eventEmitter: EventEmitter2;

  const mockPrisma = {
    financialRecord: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<RecordsService>(RecordsService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated records', async () => {
      const mockRecords = [{ id: '1' }, { id: '2' }];
      mockPrisma.financialRecord.findMany.mockResolvedValue(mockRecords);
      mockPrisma.financialRecord.count.mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a record by id', async () => {
      const mockRecord = { id: 'uuid-1', amount: 100 };
      mockPrisma.financialRecord.findFirst.mockResolvedValue(mockRecord);

      const result = await service.findOne('uuid-1');

      expect(result.id).toBe('uuid-1');
    });

    it('should throw NotFoundException for non-existent record', async () => {
      mockPrisma.financialRecord.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a record and emit event', async () => {
      const mockRecord = { id: 'new-uuid', amount: 1500 };
      mockPrisma.financialRecord.create.mockResolvedValue(mockRecord);

      const result = await service.create(
        {
          amount: 1500,
          type: 'INCOME' as any,
          category: 'Salary',
          date: '2026-01-01T00:00:00.000Z',
        },
        'user-uuid',
      );

      expect(result.id).toBe('new-uuid');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('records.changed', mockRecord);
    });
  });

  describe('remove', () => {
    it('should soft-delete a record and emit event', async () => {
      mockPrisma.financialRecord.findFirst.mockResolvedValue({ id: 'uuid-1' });
      mockPrisma.financialRecord.update.mockResolvedValue({
        id: 'uuid-1',
        isDeleted: true,
      });

      const result = await service.remove('uuid-1');

      expect(result.isDeleted).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('records.changed', expect.anything());
    });
  });
});
