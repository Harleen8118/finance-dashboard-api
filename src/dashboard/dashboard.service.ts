import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface TrendRow {
  month: string;
  type: string;
  total: Prisma.Decimal;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary() {
    const [incomeResult, expenseResult, recordCount] = await Promise.all([
      this.prisma.financialRecord.aggregate({
        where: { type: 'INCOME', isDeleted: false },
        _sum: { amount: true },
      }),
      this.prisma.financialRecord.aggregate({
        where: { type: 'EXPENSE', isDeleted: false },
        _sum: { amount: true },
      }),
      this.prisma.financialRecord.count({
        where: { isDeleted: false },
      }),
    ]);

    const totalIncome = incomeResult._sum.amount || new Prisma.Decimal(0);
    const totalExpenses = expenseResult._sum.amount || new Prisma.Decimal(0);
    const netBalance = totalIncome.minus(totalExpenses);

    return {
      totalIncome: totalIncome.toNumber(),
      totalExpenses: totalExpenses.toNumber(),
      netBalance: netBalance.toNumber(),
      recordCount,
    };
  }

  async getByCategory() {
    const results = await this.prisma.financialRecord.groupBy({
      by: ['category', 'type'],
      where: { isDeleted: false },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { category: 'asc' },
    });

    return results.map((r) => ({
      category: r.category,
      type: r.type,
      total: r._sum.amount ? r._sum.amount.toNumber() : 0,
      count: r._count.id,
    }));
  }

  async getTrends() {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const results = await this.prisma.$queryRaw<TrendRow[]>`
      SELECT
        to_char(date_trunc('month', date), 'YYYY-MM') as month,
        type::text as type,
        COALESCE(SUM(amount), 0) as total
      FROM "FinancialRecord"
      WHERE "isDeleted" = false
        AND date >= ${twelveMonthsAgo}
      GROUP BY date_trunc('month', date), type
      ORDER BY month ASC
    `;

    // Build a map of all 12 months
    const monthsMap = new Map<string, { income: number; expenses: number }>();
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap.set(key, { income: 0, expenses: 0 });
    }

    // Fill in actual data
    for (const row of results) {
      const entry = monthsMap.get(row.month);
      if (entry) {
        if (row.type === 'INCOME') {
          entry.income = Number(row.total);
        } else {
          entry.expenses = Number(row.total);
        }
      }
    }

    return Array.from(monthsMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
    }));
  }

  async getRecent() {
    return this.prisma.financialRecord.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
