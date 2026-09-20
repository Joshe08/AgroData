import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanzasService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.finanza.findMany({
      where: { organizationId: orgId },
      orderBy: { date: 'desc' },
      include: {
        finca: { select: { id: true, name: true } },
        produccion: { select: { id: true, name: true } }
      }
    });
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.finanza.findFirst({
      where: { id, organizationId: orgId },
      include: {
        finca: { select: { id: true, name: true } },
        produccion: { select: { id: true, name: true } }
      }
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
        fincaId: data.fincaId || null,
        produccionId: data.produccionId || null,
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
        fincaId: data.fincaId || null,
        produccionId: data.produccionId || null,
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
    const monthlyData: Record<string, { mes: string; ingresos: number; gastos: number }> = {};

    // Inicializar los últimos 6 meses en 0 para mantener la estructura visual
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const formatter = new Intl.DateTimeFormat('es', { month: 'short' });
      monthlyData[key] = { mes: formatter.format(d).replace('.', ''), ingresos: 0, gastos: 0 };
    }

    for (const t of transactions) {
      const cat = t.category || 'OTRO';
      if (t.type === 'INGRESO') {
        incomeByCategory[cat] = (incomeByCategory[cat] || 0) + t.amount;
      } else {
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
      }

      // Procesar por mes real
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        if (t.type === 'INGRESO') {
          monthlyData[key].ingresos += t.amount;
        } else {
          monthlyData[key].gastos += t.amount;
        }
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
      resumenMensual: Object.values(monthlyData)
    };
  }
}
