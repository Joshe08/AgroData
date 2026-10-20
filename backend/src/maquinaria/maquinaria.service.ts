import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MaquinariaService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.maquinaria.findMany({
      where: { organizationId: orgId },
      include: {
        finca: { select: { id: true, name: true, location: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const maquina = await this.prisma.maquinaria.findFirst({
      where: { id, organizationId: orgId },
      include: {
        finca: { select: { id: true, name: true, location: true } },
      },
    });
    if (!maquina) {
      throw new NotFoundException('Maquinaria no encontrada');
    }
    return maquina;
  }

  async create(orgId: string, data: any) {
    return this.prisma.maquinaria.create({
      data: {
        name: String(data.name || data.nombre).trim(),
        tipo: data.tipo || 'Tractor agrícola',
        marca: data.marca || null,
        modelo: data.modelo || null,
        placa: data.placa || null,
        imageUrl: data.imageUrl || null,
        status: data.status || data.estado || 'OPERATIVE',
        fincaId: data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null,
        fechaAdquisicion: data.fechaAdquisicion || data.fechaCompra ? new Date(data.fechaAdquisicion || data.fechaCompra) : null,
        valor: data.valor !== undefined && data.valor !== null && data.valor !== '' ? parseFloat(data.valor) : null,
        horasUso: data.horasUso !== undefined && data.horasUso !== null && data.horasUso !== '' ? parseFloat(data.horasUso) : null,
        observaciones: data.observaciones || null,
        lastMaintenance: data.lastMaintenance ? new Date(data.lastMaintenance) : null,
        nextMaintenance: data.nextMaintenance ? new Date(data.nextMaintenance) : null,
        maintenanceCost: data.maintenanceCost !== undefined && data.maintenanceCost !== null ? parseFloat(data.maintenanceCost) : 0.0,
        organizationId: orgId,
      },
      include: {
        finca: { select: { id: true, name: true, location: true } },
      },
    });
  }

  async update(id: string, orgId: string, data: any) {
    const existing = await this.prisma.maquinaria.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Maquinaria no encontrada o no pertenece a tu organización');
    }

    const updateData: any = {};
    if (data.name !== undefined || data.nombre !== undefined) {
      updateData.name = String(data.name ?? data.nombre).trim();
    }
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.marca !== undefined) updateData.marca = data.marca || null;
    if (data.modelo !== undefined) updateData.modelo = data.modelo || null;
    if (data.placa !== undefined) updateData.placa = data.placa || null;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl || null;
    if (data.status !== undefined || data.estado !== undefined) {
      updateData.status = data.status ?? data.estado;
    }
    if (data.fincaId !== undefined) {
      updateData.fincaId = data.fincaId && String(data.fincaId).trim() !== '' ? String(data.fincaId) : null;
    }
    if (data.fechaAdquisicion !== undefined || data.fechaCompra !== undefined) {
      const f = data.fechaAdquisicion ?? data.fechaCompra;
      updateData.fechaAdquisicion = f ? new Date(f) : null;
    }
    if (data.valor !== undefined) {
      updateData.valor = data.valor !== null && data.valor !== '' ? parseFloat(data.valor) : null;
    }
    if (data.horasUso !== undefined) {
      updateData.horasUso = data.horasUso !== null && data.horasUso !== '' ? parseFloat(data.horasUso) : null;
    }
    if (data.observaciones !== undefined) {
      updateData.observaciones = data.observaciones || null;
    }
    if (data.lastMaintenance !== undefined) {
      updateData.lastMaintenance = data.lastMaintenance ? new Date(data.lastMaintenance) : null;
    }
    if (data.nextMaintenance !== undefined) {
      updateData.nextMaintenance = data.nextMaintenance ? new Date(data.nextMaintenance) : null;
    }
    if (data.maintenanceCost !== undefined) {
      updateData.maintenanceCost = data.maintenanceCost !== null ? parseFloat(data.maintenanceCost) : 0.0;
    }

    return this.prisma.maquinaria.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        finca: { select: { id: true, name: true, location: true } },
      },
    });
  }

  async uploadImage(id: string, orgId: string, file: Express.Multer.File): Promise<{ imageUrl: string }> {
    const existing = await this.prisma.maquinaria.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Maquinaria no encontrada');
    }

    // Eliminar imagen anterior si existe
    if (existing.imageUrl) {
      const oldPath = path.join(process.cwd(), 'uploads', path.basename(existing.imageUrl));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const imageUrl = `/uploads/${file.filename}`;
    await this.prisma.maquinaria.update({
      where: { id },
      data: { imageUrl },
    });

    return { imageUrl };
  }

  async delete(id: string, orgId: string) {
    const existing = await this.prisma.maquinaria.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) {
      throw new NotFoundException('Maquinaria no encontrada');
    }

    // Eliminar imagen si existe
    if (existing.imageUrl) {
      const imgPath = path.join(process.cwd(), 'uploads', path.basename(existing.imageUrl));
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await this.prisma.maquinaria.delete({ where: { id } });
    return { success: true, message: 'Maquinaria eliminada correctamente' };
  }
}
