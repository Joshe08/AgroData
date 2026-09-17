import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.inventario.findMany({
      where: { organizationId: orgId },
      include: {
        finca: {
          select: { id: true, name: true, location: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.inventario.findFirst({
      where: { id, organizationId: orgId },
      include: {
        finca: {
          select: { id: true, name: true, location: true },
        },
      },
    });
  }

  async findAlertas(orgId: string) {
    const items = await this.findAll(orgId);
    return items.filter((item) => item.quantity <= item.minAlertQuantity);
  }

  async create(orgId: string, data: any) {
    return this.prisma.inventario.create({
      data: {
        name: data.name,
        category: data.category,
        quantity: parseFloat(data.quantity),
        unit: data.unit,
        minAlertQuantity: data.minAlertQuantity ? parseFloat(data.minAlertQuantity) : 10.0,
        proveedor: data.proveedor ? String(data.proveedor).trim() : null,
        costo: data.costo !== undefined && data.costo !== null && data.costo !== '' ? parseFloat(data.costo) : null,
        fincaId: data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null,
        organizationId: orgId,
      },
      include: {
        finca: {
          select: { id: true, name: true, location: true },
        },
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    return this.prisma.inventario.updateMany({
      where: { id, organizationId: orgId },
      data: {
        name: data.name,
        category: data.category,
        quantity: data.quantity !== undefined && data.quantity !== null && data.quantity !== '' ? parseFloat(data.quantity) : undefined,
        unit: data.unit,
        minAlertQuantity: data.minAlertQuantity !== undefined && data.minAlertQuantity !== null && data.minAlertQuantity !== '' ? parseFloat(data.minAlertQuantity) : undefined,
        proveedor: data.proveedor !== undefined ? (data.proveedor ? String(data.proveedor).trim() : null) : undefined,
        costo: data.costo !== undefined ? (data.costo !== null && data.costo !== '' ? parseFloat(data.costo) : null) : undefined,
        fincaId: data.fincaId !== undefined ? (data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null) : undefined,
      },
    });
  }

  async delete(id: string, orgId: string) {
    return this.prisma.inventario.deleteMany({
      where: { id, organizationId: orgId },
    });
  }
}
