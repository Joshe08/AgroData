import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanzasService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.finanza.findMany({
      where: { organizationId: orgId },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.finanza.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  async create(orgId: string, data: any) {
    return this.prisma.finanza.create({
      data: {
        type: data.type, // INGRESO, GASTO
        category: data.category,
        amount: parseFloat(data.amount),
        description: data.description || null,
        date: data.date ? new Date(data.date) : new Date(),
        organizationId: orgId,
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    return this.prisma.finanza.updateMany({
      where: { id, organizationId: orgId },
      data: {
        type: data.type,
        category: data.category,
        amount: data.amount !== undefined ? parseFloat(data.amount) : undefined,
        description: data.description || null,
        date: data.date ? new Date(data.date) : undefined,
      },
    });
  }

  async delete(id: string, orgId: string) {
    return this.prisma.finanza.deleteMany({
      where: { id, organizationId: orgId },
    });
  }

  // Summary Metrics endpoint
  async getMetrics(orgId: string) {
    const transactions = await this.prisma.finanza.findMany({
      where: { organizationId: orgId },
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions) {
      if (t.type === 'INGRESO') {
        totalIncome += t.amount;
      } else {
        totalExpenses += t.amount;
      }
    }

    const netProfit = totalIncome - totalExpenses;

    const expensesByCategory: Record<string, number> = {};
    const incomeByCategory: Record<string, number> = {};

    for (const t of transactions) {
      const cat = t.category || 'OTRO';
      if (t.type === 'INGRESO') {
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount;
      } else {
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      totalIngresos: totalIncome,
      totalGastos: totalExpenses,
      balance: netProfit,
      incomeByCategory,
      expensesByCategory,
      transactionCount: transactions.length,
    };
  }
}
