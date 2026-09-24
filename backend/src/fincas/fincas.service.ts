import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FincasService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    return this.prisma.finca.findMany({
      where: { organizationId: orgId },
      include: {
        lotes: true,
        _count: {
          select: { lotes: true, empleados: true, maquinarias: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, orgId: string) {
    const finca = await this.prisma.finca.findFirst({
      where: { id, organizationId: orgId },
      include: {
        lotes: true,
        empleados: true,
        maquinarias: true,
      },
    });
    if (!finca) {
      throw new NotFoundException('Finca no encontrada');
    }
    return finca;
  }

  async create(orgId: string, data: any) {
    // Validar límites del plan de suscripción
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { subscription: true },
    });

    const currentFincasCount = await this.prisma.finca.count({
      where: { organizationId: orgId },
    });

    const plan = org?.subscription || 'FREE';
    if (plan === 'FREE' && currentFincasCount >= 1) {
      throw new BadRequestException(
        'El Plan FREE permite registrar máximo 1 finca. Actualiza a PREMIUM para agregar más predios.'
      );
    } else if (plan === 'PREMIUM' && currentFincasCount >= 5) {
      throw new BadRequestException(
        'El Plan PREMIUM permite registrar hasta 5 fincas. Actualiza a ENTERPRISE para predios ilimitados.'
      );
    }

    return this.prisma.finca.create({
      data: {
        name: String(data.name || data.nombre).trim(),
        location: String(data.location || data.ubicacion || 'Colombia').trim(),
        area: parseFloat(data.area || data.hectareas || '1'),
        description: data.description || data.descripcion || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        tipoExplotacion: data.tipoExplotacion || 'MIXTA',
        estado: data.estado || 'ACTIVA',
        tipoSuelo: data.tipoSuelo || null,
        fuenteAgua: data.fuenteAgua || null,
        sistemaRiego: data.sistemaRiego || null,
        tipoAcceso: data.tipoAcceso || null,
        departamento: data.departamento || null,
        municipio: data.municipio || null,
        vereda: data.vereda || null,
        referenciaAcceso: data.referenciaAcceso || null,
        actividades: Array.isArray(data.actividades)
          ? JSON.stringify(data.actividades)
          : (typeof data.actividades === 'string' ? data.actividades : null),
        organizationId: orgId,
      },
      include: { lotes: true },
    });
  }

  async update(id: string, orgId: string, data: any) {
    const existing = await this.prisma.finca.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException('Finca no encontrada o no pertenece a tu organización.');
    }

    const updateData: any = {};
    if (data.name !== undefined || data.nombre !== undefined) {
      updateData.name = String(data.name ?? data.nombre).trim();
    }
    if (data.location !== undefined || data.ubicacion !== undefined) {
      updateData.location = String(data.location ?? data.ubicacion).trim();
    }
    if (data.area !== undefined || data.hectareas !== undefined) {
      updateData.area = parseFloat(data.area ?? data.hectareas);
    }
    if (data.description !== undefined || data.descripcion !== undefined) {
      updateData.description = (data.description ?? data.descripcion) || null;
    }
    if (data.latitude !== undefined) {
      updateData.latitude = data.latitude !== null && data.latitude !== '' ? parseFloat(data.latitude) : null;
    }
    if (data.longitude !== undefined) {
      updateData.longitude = data.longitude !== null && data.longitude !== '' ? parseFloat(data.longitude) : null;
    }
    if (data.tipoExplotacion !== undefined) updateData.tipoExplotacion = data.tipoExplotacion;
    if (data.estado !== undefined) updateData.estado = data.estado;
    if (data.tipoSuelo !== undefined) updateData.tipoSuelo = data.tipoSuelo;
    if (data.fuenteAgua !== undefined) updateData.fuenteAgua = data.fuenteAgua;
    if (data.sistemaRiego !== undefined) updateData.sistemaRiego = data.sistemaRiego;
    if (data.tipoAcceso !== undefined) updateData.tipoAcceso = data.tipoAcceso;
    if (data.departamento !== undefined) updateData.departamento = data.departamento;
    if (data.municipio !== undefined) updateData.municipio = data.municipio;
    if (data.vereda !== undefined) updateData.vereda = data.vereda;
    if (data.referenciaAcceso !== undefined) updateData.referenciaAcceso = data.referenciaAcceso;
    if (data.actividades !== undefined) {
      updateData.actividades = Array.isArray(data.actividades)
        ? JSON.stringify(data.actividades)
        : (typeof data.actividades === 'string' ? data.actividades : null);
    }

    return this.prisma.finca.update({
      where: { id: existing.id },
      data: updateData,
      include: { lotes: true },
    });
  }

  async delete(id: string, orgId: string) {
    const existing = await this.prisma.finca.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException('Finca no encontrada o no pertenece a tu organización.');
    }

    // Desasociar empleados y maquinarias de esta finca antes de eliminar
    await this.prisma.empleado.updateMany({
      where: { fincaId: id },
      data: { fincaId: null },
    });
    await this.prisma.maquinaria.updateMany({
      where: { fincaId: id },
      data: { fincaId: null },
    });
    await this.prisma.inventario.updateMany({
      where: { fincaId: id },
      data: { fincaId: null },
    });
    await this.prisma.finanza.updateMany({
      where: { fincaId: id },
      data: { fincaId: null },
    });

    // Eliminar lotes y sus producciones asociadas
    const lotes = await this.prisma.lote.findMany({ where: { fincaId: id } });
    for (const lote of lotes) {
      const prods = await this.prisma.produccion.findMany({ where: { loteId: lote.id } });
      const prodIds = prods.map((p) => p.id);
      if (prodIds.length > 0) {
        await this.prisma.diarioProduccion.deleteMany({
          where: { produccionId: { in: prodIds } },
        });
        await this.prisma.finanza.updateMany({
          where: { produccionId: { in: prodIds } },
          data: { produccionId: null },
        });
        await this.prisma.produccion.deleteMany({
          where: { loteId: lote.id },
        });
      }
    }
    await this.prisma.lote.deleteMany({ where: { fincaId: id } });

    await this.prisma.finca.delete({
      where: { id },
    });

    return { success: true, message: 'Finca eliminada correctamente' };
  }

  // Lotes CRUD
  async findAllLotes(fincaId: string, orgId: string) {
    await this.findOne(fincaId, orgId);
    return this.prisma.lote.findMany({
      where: { fincaId },
      orderBy: { name: 'asc' },
    });
  }

  async createLote(fincaId: string, orgId: string, data: any) {
    await this.findOne(fincaId, orgId);
    return this.prisma.lote.create({
      data: {
        name: String(data.name || data.nombre).trim(),
        area: parseFloat(data.area || data.hectareas || '1'),
        soilType: data.soilType || data.tipoSuelo || null,
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
      throw new NotFoundException('Lote no encontrado o acceso denegado');
    }

    const prods = await this.prisma.produccion.findMany({ where: { loteId } });
    const prodIds = prods.map((p) => p.id);
    if (prodIds.length > 0) {
      await this.prisma.diarioProduccion.deleteMany({ where: { produccionId: { in: prodIds } } });
      await this.prisma.finanza.updateMany({
        where: { produccionId: { in: prodIds } },
        data: { produccionId: null },
      });
      await this.prisma.produccion.deleteMany({ where: { loteId } });
    }

    return this.prisma.lote.delete({ where: { id: loteId } });
  }
}
