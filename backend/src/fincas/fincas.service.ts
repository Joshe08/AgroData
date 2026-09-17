import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FincasService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.finca.findMany({
      where: { organizationId: orgId },
      include: { lotes: true },
    });
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.finca.findFirst({
      where: { id, organizationId: orgId },
      include: { lotes: true },
    });
  }

  async create(orgId: string, data: any) {
    return this.prisma.finca.create({
      data: {
        name: data.name,
        location: data.location,
        area: parseFloat(data.area),
        description: data.description || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        organizationId: orgId,
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    return this.prisma.finca.updateMany({
      where: { id, organizationId: orgId },
      data: {
        name: data.name,
        location: data.location,
        area: data.area ? parseFloat(data.area) : undefined,
        description: data.description !== undefined ? (data.description || null) : undefined,
        latitude: data.latitude !== undefined ? (data.latitude ? parseFloat(data.latitude) : null) : undefined,
        longitude: data.longitude !== undefined ? (data.longitude ? parseFloat(data.longitude) : null) : undefined,
      },
    });
  }

  async delete(id: string, orgId: string) {
    const lotes = await this.prisma.lote.findMany({ where: { fincaId: id } });
    for (const lote of lotes) {
      await this.prisma.diarioProduccion.deleteMany({ where: { produccion: { loteId: lote.id } } });
      await this.prisma.produccion.deleteMany({ where: { loteId: lote.id } });
    }
    await this.prisma.lote.deleteMany({ where: { fincaId: id } });
    return this.prisma.finca.deleteMany({
      where: { id, organizationId: orgId },
    });
  }

  // Lotes CRUD
  async findAllLotes(fincaId: string, orgId: string) {
    const finca = await this.findOne(fincaId, orgId);
    if (!finca) return [];
    return this.prisma.lote.findMany({
      where: { fincaId },
    });
  }

  async createLote(fincaId: string, orgId: string, data: any) {
    const finca = await this.findOne(fincaId, orgId);
    if (!finca) throw new Error('Finca no encontrada o no pertenece a la organización');
    return this.prisma.lote.create({
      data: {
        name: data.name,
        area: parseFloat(data.area),
        soilType: data.soilType || null,
        fincaId,
      },
    });
  }

  async deleteLote(loteId: string, orgId: string) {
    const lote = await this.prisma.lote.findUnique({
      where: { id: loteId },
      include: { finca: true },
    });
    if (!lote || lote.finca.organizationId !== orgId) {
      throw new Error('Lote no encontrado o acceso denegado');
    }
    await this.prisma.diarioProduccion.deleteMany({ where: { produccionId: { in: (await this.prisma.produccion.findMany({ where: { loteId } })).map(p => p.id) } } });
    await this.prisma.produccion.deleteMany({ where: { loteId } });
    return this.prisma.lote.delete({ where: { id: loteId } });
  }
}
