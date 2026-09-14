import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.empleado.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.empleado.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  async create(orgId: string, data: any) {
    return this.prisma.empleado.create({
      data: {
        name: data.name,
        role: data.role,
        status: data.status || 'ACTIVE',
        dailyRate: data.dailyRate ? parseFloat(data.dailyRate) : null,
        phone: data.phone || null,
        organizationId: orgId,
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    return this.prisma.empleado.updateMany({
      where: { id, organizationId: orgId },
      data: {
        name: data.name,
        role: data.role,
        status: data.status,
        dailyRate: data.dailyRate !== undefined ? (data.dailyRate ? parseFloat(data.dailyRate) : null) : undefined,
        phone: data.phone || null,
      },
    });
  }

  async delete(id: string, orgId: string) {
    return this.prisma.empleado.deleteMany({
      where: { id, organizationId: orgId },
    });
  }
}
