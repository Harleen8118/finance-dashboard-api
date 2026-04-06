import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordDto, UpdateRecordDto, FilterRecordsDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RecordsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(filters: FilterRecordsDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.FinancialRecordWhereInput = {
      isDeleted: false,
    };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.from || filters.to) {
      where.date = {};
      if (filters.from) {
        where.date.gte = new Date(filters.from);
      }
      if (filters.to) {
        where.date.lte = new Date(filters.to);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.financialRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.financialRecord.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const record = await this.prisma.financialRecord.findFirst({
      where: { id, isDeleted: false },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!record) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }

    return record;
  }

  async create(dto: CreateRecordDto, userId: string) {
    const record = await this.prisma.financialRecord.create({
      data: {
        amount: dto.amount,
        type: dto.type,
        category: dto.category,
        date: new Date(dto.date),
        description: dto.description,
        userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.eventEmitter.emit('records.changed', record);
    return record;
  }

  async update(id: string, dto: UpdateRecordDto) {
    await this.findOne(id); // ensure exists and not deleted

    const data: Prisma.FinancialRecordUpdateInput = {};
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.description !== undefined) data.description = dto.description;

    const record = await this.prisma.financialRecord.update({
      where: { id },
      data,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.eventEmitter.emit('records.changed', record);
    return record;
  }

  async remove(id: string) {
    await this.findOne(id); // ensure exists and not deleted

    const record = await this.prisma.financialRecord.update({
      where: { id },
      data: { isDeleted: true },
    });

    this.eventEmitter.emit('records.changed', record);
    return record;
  }
}
