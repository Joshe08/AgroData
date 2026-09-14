import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.inventario.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.inventario.findFirst({
      where: { id, organizationId: orgId },
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
        organizationId: orgId,
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    return this.prisma.inventario.updateMany({
      where: { id, organizationId: orgId },
      data: {
        name: data.name,
        category: data.category,
        quantity: data.quantity !== undefined ? parseFloat(data.quantity) : undefined,
        unit: data.unit,
        minAlertQuantity: data.minAlertQuantity !== undefined ? parseFloat(data.minAlertQuantity) : undefined,
      },
    });
  }

  async delete(id: string, orgId: string) {
    return this.prisma.inventario.deleteMany({
      where: { id, organizationId: orgId },
    });
  }
}
