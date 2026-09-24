import { Injectable, NotFoundException } from '@nestjs/common';
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
        produccion: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string, orgId: string) {
    const item = await this.prisma.finanza.findFirst({
      where: { id, organizationId: orgId },
      include: {
        finca: { select: { id: true, name: true } },
        produccion: { select: { id: true, name: true } },
      },
    });
    if (!item) {
      throw new NotFoundException('Movimiento financiero no encontrado');
    }
    return item;
  }

  async create(orgId: string, data: any) {
    return this.prisma.finanza.create({
      data: {
        type: data.type || data.tipo, // INGRESO, GASTO
        category: data.category || data.categoria,
        amount: parseFloat(data.amount ?? data.monto),
        description: data.description ?? data.descripcion ?? null,
        date: data.date || data.fecha ? new Date(data.date || data.fecha) : new Date(),
        fincaId: data.fincaId ? String(data.fincaId) : null,
        produccionId: data.produccionId ? String(data.produccionId) : null,
        organizationId: orgId,
      },
      include: {
        finca: { select: { id: true, name: true } },
        produccion: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    const existing = await this.prisma.finanza.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Movimiento financiero no encontrado o no pertenece a tu organización');
    }

    const updateData: any = {};
    if (data.type !== undefined || data.tipo !== undefined) {
      updateData.type = data.type || data.tipo;
    }
    if (data.category !== undefined || data.categoria !== undefined) {
      updateData.category = data.category || data.categoria;
    }
    if (data.amount !== undefined || data.monto !== undefined) {
      updateData.amount = parseFloat(data.amount ?? data.monto);
    }
    if (data.description !== undefined || data.descripcion !== undefined) {
      updateData.description = (data.description ?? data.descripcion) || null;
    }
    if (data.date !== undefined || data.fecha !== undefined) {
      updateData.date = new Date(data.date || data.fecha);
    }
    if (data.fincaId !== undefined) {
      updateData.fincaId = data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null;
    }
    if (data.produccionId !== undefined) {
      updateData.produccionId = data.produccionId && String(data.produccionId).trim() !== '' ? String(data.produccionId) : null;
    }

    return this.prisma.finanza.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        finca: { select: { id: true, name: true } },
        produccion: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string, orgId: string) {
    const existing = await this.prisma.finanza.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Movimiento financiero no encontrado');
    }

    await this.prisma.finanza.delete({
      where: { id },
    });

    return { success: true, message: 'Movimiento eliminado correctamente' };
  }

  // Summary Metrics endpoint
  async getMetrics(orgId: string) {
    const transactions = await this.prisma.finanza.findMany({
      where: { organizationId: orgId },
      orderBy: { date: 'asc' },
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
      resumenMensual: Object.values(monthlyData),
    };
  }
}
