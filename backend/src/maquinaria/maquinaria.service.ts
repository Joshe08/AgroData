import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaquinariaService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.maquinaria.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.maquinaria.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  async create(orgId: string, data: any) {
    return this.prisma.maquinaria.create({
      data: {
        name: data.name,
        status: data.status || 'OPERATIVE',
        lastMaintenance: data.lastMaintenance ? new Date(data.lastMaintenance) : null,
        maintenanceCost: data.maintenanceCost ? parseFloat(data.maintenanceCost) : 0.0,
        organizationId: orgId,
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    return this.prisma.maquinaria.updateMany({
      where: { id, organizationId: orgId },
      data: {
        name: data.name,
        status: data.status,
        lastMaintenance: data.lastMaintenance ? new Date(data.lastMaintenance) : undefined,
        maintenanceCost: data.maintenanceCost !== undefined ? parseFloat(data.maintenanceCost) : undefined,
      },
    });
  }

  async delete(id: string, orgId: string) {
    return this.prisma.maquinaria.deleteMany({
      where: { id, organizationId: orgId },
    });
  }
}
