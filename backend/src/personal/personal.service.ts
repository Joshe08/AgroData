import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.empleado.findMany({
      where: { organizationId: orgId },
      include: {
        finca: { select: { id: true, name: true, location: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const empleado = await this.prisma.empleado.findFirst({
      where: { id, organizationId: orgId },
      include: {
        finca: { select: { id: true, name: true, location: true } },
      },
    });
    if (!empleado) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return empleado;
  }

  async create(orgId: string, data: any) {
    return this.prisma.empleado.create({
      data: {
        name: String(data.name || data.nombre).trim(),
        lastName: data.lastName || data.apellido || null,
        documento: data.documento || null,
        email: data.email || data.correo || null,
        phone: data.phone || data.telefono || null,
        role: data.role || data.cargo || 'Operario de campo / Jornalero',
        status: data.status || data.tipoContrato || 'ACTIVE',
        dailyRate: data.dailyRate !== undefined && data.dailyRate !== null && data.dailyRate !== ''
          ? parseFloat(data.dailyRate)
          : (data.salario !== undefined && data.salario !== null && data.salario !== '' ? parseFloat(data.salario) : null),
        fechaIngreso: data.fechaIngreso ? new Date(data.fechaIngreso) : new Date(),
        fincaId: data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null,
        notes: data.notes || data.observaciones || null,
        organizationId: orgId,
      },
      include: {
        finca: { select: { id: true, name: true, location: true } },
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    const existing = await this.prisma.empleado.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Empleado no encontrado o no pertenece a tu organización');
    }

    const updateData: any = {};
    if (data.name !== undefined || data.nombre !== undefined) {
      updateData.name = String(data.name ?? data.nombre).trim();
    }
    if (data.lastName !== undefined || data.apellido !== undefined) {
      updateData.lastName = data.lastName ?? data.apellido ?? null;
    }
    if (data.documento !== undefined) updateData.documento = data.documento || null;
    if (data.email !== undefined || data.correo !== undefined) {
      updateData.email = data.email ?? data.correo ?? null;
    }
    if (data.phone !== undefined || data.telefono !== undefined) {
      updateData.phone = data.phone ?? data.telefono ?? null;
    }
    if (data.role !== undefined || data.cargo !== undefined) {
      updateData.role = data.role ?? data.cargo;
    }
    if (data.status !== undefined || data.tipoContrato !== undefined) {
      updateData.status = data.status ?? data.tipoContrato;
    }
    if (data.dailyRate !== undefined || data.salario !== undefined) {
      const val = data.dailyRate !== undefined ? data.dailyRate : data.salario;
      updateData.dailyRate = val !== null && val !== '' ? parseFloat(val) : null;
    }
    if (data.fechaIngreso !== undefined) {
      updateData.fechaIngreso = data.fechaIngreso ? new Date(data.fechaIngreso) : null;
    }
    if (data.fincaId !== undefined) {
      updateData.fincaId = data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null;
    }
    if (data.notes !== undefined || data.observaciones !== undefined) {
      updateData.notes = data.notes ?? data.observaciones ?? null;
    }

    return this.prisma.empleado.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        finca: { select: { id: true, name: true, location: true } },
      },
    });
  }

  async delete(id: string, orgId: string) {
    const existing = await this.prisma.empleado.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Empleado no encontrado');
    }

    await this.prisma.empleado.delete({
      where: { id },
    });

    return { success: true, message: 'Empleado eliminado correctamente' };
  }
}
