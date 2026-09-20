import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProduccionesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    if (!orgId) return [];
    try {
      return await this.prisma.produccion.findMany({
        where: {
          lote: {
            finca: {
              organizationId: orgId,
            },
          },
        },
        include: {
          lote: {
            include: {
              finca: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      console.error('Error al consultar producciones en ProduccionesService.findAll:', error);
      return [];
    }
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.produccion.findFirst({
      where: {
        id,
        lote: {
          finca: {
            organizationId: orgId,
          },
        },
      },
      include: {
        lote: {
          include: {
            finca: true,
          },
        },
        diarios: {
          orderBy: {
            date: 'desc',
          },
        },
      },
    });
  }

  async create(data: any, orgId: string) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: data.loteId },
      include: { finca: true },
    });
    if (!lote || lote.finca.organizationId !== orgId) {
      throw new Error('Lote no encontrado o acceso denegado');
    }

    // Business Rule: Ensure only one production is active on a lote at any time.
    if (data.status === 'ACTIVE') {
      await this.prisma.produccion.updateMany({
        where: { loteId: data.loteId, status: 'ACTIVE' },
        data: { status: 'COMPLETED', endDate: new Date() },
      });
    }

    return this.prisma.produccion.create({
      data: {
        name: data.name,
        type: data.type,
        status: data.status || 'ACTIVE',
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        expectedYield: data.expectedYield !== undefined && data.expectedYield !== null && data.expectedYield !== '' ? parseFloat(data.expectedYield) : null,
        actualYield: data.actualYield !== undefined && data.actualYield !== null && data.actualYield !== '' ? parseFloat(data.actualYield) : null,
        unit: data.unit || null,
        loteId: data.loteId,
        metadata: data.metadata ? (typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata)) : null,
      },
    });
  }

  async update(id: string, data: any, orgId: string) {
    const prod = await this.findOne(id, orgId);
    if (!prod) throw new Error('Producción no encontrada');

    return this.prisma.produccion.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        type: data.type !== undefined ? data.type : undefined,
        status: data.status !== undefined ? data.status : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
        actualYield: data.actualYield !== undefined ? (data.actualYield ? parseFloat(data.actualYield) : null) : undefined,
        expectedYield: data.expectedYield !== undefined ? (data.expectedYield ? parseFloat(data.expectedYield) : null) : undefined,
        unit: data.unit !== undefined ? data.unit : undefined,
        loteId: data.loteId !== undefined ? data.loteId : undefined,
        metadata: data.metadata ? (typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata)) : undefined,
      },
    });
  }

  async delete(id: string, orgId: string) {
    const prod = await this.findOne(id, orgId);
    if (!prod) throw new Error('Producción no encontrada');
    await this.prisma.diarioProduccion.deleteMany({ where: { produccionId: id } });
    return this.prisma.produccion.delete({ where: { id } });
  }

  // DiarioProduccion CRUD
  async createDiario(produccionId: string, data: any, orgId: string) {
    const prod = await this.findOne(produccionId, orgId);
    if (!prod) throw new Error('Producción no encontrada o denegada');

    if (data.yieldObtained) {
      const currentYield = prod.actualYield || 0;
      await this.prisma.produccion.update({
        where: { id: produccionId },
        data: { actualYield: currentYield + parseFloat(data.yieldObtained) },
      });
    }

    return this.prisma.diarioProduccion.create({
      data: {
        activity: data.activity,
        observations: data.observations || null,
        photoUrl: data.photoUrl || null,
        diseases: data.diseases || null,
        fertilizerUsed: data.fertilizerUsed || null,
        waterIrrigation: data.waterIrrigation ? parseFloat(data.waterIrrigation) : null,
        yieldObtained: data.yieldObtained ? parseFloat(data.yieldObtained) : null,
        produccionId,
        date: data.date ? new Date(data.date) : new Date(),
      },
    });
  }

  async deleteDiario(diarioId: string, orgId: string) {
    const diario = await this.prisma.diarioProduccion.findUnique({
      where: { id: diarioId },
      include: {
        produccion: {
          include: {
            lote: {
              include: {
                finca: true,
              },
            },
          },
        },
      },
    });

    if (!diario || diario.produccion.lote.finca.organizationId !== orgId) {
      throw new Error('Registro diario no encontrado o acceso denegado');
    }

    if (diario.yieldObtained) {
      const prod = diario.produccion;
      const currentYield = prod.actualYield || 0;
      await this.prisma.produccion.update({
        where: { id: prod.id },
        data: { actualYield: Math.max(0, currentYield - diario.yieldObtained) },
      });
    }

    return this.prisma.diarioProduccion.delete({ where: { id: diarioId } });
  }
}
