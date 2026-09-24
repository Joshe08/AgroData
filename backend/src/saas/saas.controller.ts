import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@ApiTags('saas-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('saas')
export class SaasController {
  constructor(private prisma: PrismaService) {}

  private assertSuperAdmin(req: any) {
    if (req.user?.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Acceso exclusivo para el Superadmin de la plataforma.');
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas globales de la plataforma (Solo Superadmin)' })
  async getStats(@Request() req: any) {
    this.assertSuperAdmin(req);

    const [totalOrgs, totalUsers, subscriptions, orgsByStatus] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.organization.groupBy({
        by: ['subscription'],
        _count: { subscription: true },
      }),
      this.prisma.organization.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      ACTIVE: 0,
      SUSPENDED: 0,
      PENDING: 0,
      CANCELLED: 0,
    };
    for (const item of orgsByStatus) {
      if (item.status) {
        statusCounts[item.status] = item._count.status;
      }
    }

    const orgs = await this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        nit: true,
        orgType: true,
        subscription: true,
        status: true,
        suspendedAt: true,
        suspendedReason: true,
        reactivatedAt: true,
        phone: true,
        address: true,
        createdAt: true,
        _count: {
          select: { users: true, fincas: true, inventarios: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalOrganizaciones: totalOrgs,
      totalUsuarios: totalUsers,
      organizacionesActivas: statusCounts.ACTIVE || 0,
      organizacionesSuspendidas: statusCounts.SUSPENDED || 0,
      organizacionesPendientes: statusCounts.PENDING || 0,
      suscripciones: subscriptions.map((s) => ({
        plan: s.subscription,
        cantidad: s._count.subscription,
      })),
      organizaciones: orgs.map((o) => ({
        id: o.id,
        nombre: o.name,
        nit: o.nit,
        orgType: o.orgType || 'EMPRESA',
        plan: o.subscription,
        status: o.status || 'ACTIVE',
        suspendedAt: o.suspendedAt,
        suspendedReason: o.suspendedReason,
        reactivatedAt: o.reactivatedAt,
        phone: o.phone,
        address: o.address,
        usuarios: o._count.users,
        fincas: o._count.fincas,
        fechaRegistro: o.createdAt,
      })),
    };
  }

  // --- GESTIÓN DE ORGANIZACIONES / EMPRESAS ---

  @Get('organizations')
  @ApiOperation({ summary: 'Listar todas las organizaciones registradas' })
  async getOrganizations(@Request() req: any) {
    this.assertSuperAdmin(req);
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true, fincas: true, inventarios: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('organizations')
  @ApiOperation({ summary: 'Crear una nueva empresa/organización con usuario propietario opcional' })
  async createOrganization(@Body() body: any, @Request() req: any) {
    this.assertSuperAdmin(req);

    if (!body.name || !String(body.name).trim()) {
      throw new BadRequestException('El nombre de la empresa u organización es obligatorio.');
    }

    const orgType = body.orgType || 'EMPRESA';
    const isEmpresa = orgType === 'EMPRESA' || orgType === 'COOPERATIVA';

    let nit = body.nit ? String(body.nit).trim() : null;
    if (orgType === 'PERSONA_NATURAL') {
      // Persona Natural: NIT no es obligatorio; si lo proporciona se guarda, de lo contrario es nulo
      nit = body.nit ? String(body.nit).trim() : null;
    } else if (isEmpresa && !nit) {
      throw new BadRequestException('El NIT es obligatorio para Empresas y Cooperativas.');
    }

    if (body.ownerEmail) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: String(body.ownerEmail).trim().toLowerCase() },
      });
      if (existingUser) {
        throw new BadRequestException('El correo del propietario ya está registrado en otra cuenta.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: String(body.name).trim(),
          nit,
          orgType,
          subscription: body.subscription || 'FREE',
          status: body.status || 'ACTIVE',
          phone: body.phone ? String(body.phone).trim() : null,
          address: body.address ? String(body.address).trim() : null,
        },
      });

      if (body.ownerEmail && body.ownerName) {
        const passwordHash = await bcrypt.hash(body.ownerPassword || '123456', 10);
        await tx.user.create({
          data: {
            email: String(body.ownerEmail).trim().toLowerCase(),
            name: String(body.ownerName).trim(),
            passwordHash,
            role: 'PROPIETARIO',
            organizationId: org.id,
          },
        });
      }

      return org;
    });
  }

  @Put('organizations/:id')
  @ApiOperation({ summary: 'Actualizar empresa u organización' })
  async updateOrganization(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    this.assertSuperAdmin(req);

    const existing = await this.prisma.organization.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Organización no encontrada.');
    }

    const data: any = {};
    if (body.name !== undefined) {
      if (!String(body.name).trim()) {
        throw new BadRequestException('El nombre de la organización no puede estar vacío.');
      }
      data.name = String(body.name).trim();
    }

    const orgType = body.orgType !== undefined ? body.orgType : existing.orgType;
    if (body.orgType !== undefined) {
      data.orgType = body.orgType;
    }

    if (body.nit !== undefined) {
      const cleanNit = body.nit ? String(body.nit).trim() : null;
      if ((orgType === 'EMPRESA' || orgType === 'COOPERATIVA') && !cleanNit) {
        throw new BadRequestException('El NIT es obligatorio para Empresas y Cooperativas.');
      }
      data.nit = cleanNit;
    }

    if (body.subscription !== undefined) data.subscription = body.subscription;
    if (body.status !== undefined) data.status = body.status;
    if (body.phone !== undefined) data.phone = body.phone ? String(body.phone).trim() : null;
    if (body.address !== undefined) data.address = body.address ? String(body.address).trim() : null;

    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  @Patch('organizations/:id/suspend')
  @ApiOperation({ summary: 'Suspender temporalmente el servicio de una organización' })
  async suspendOrganization(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    this.assertSuperAdmin(req);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organización no encontrada.');
    }

    const reason = body?.reason ? String(body.reason).trim() : 'Falta de pago o mora en suscripción';
    const oldStatus = org.status || 'ACTIVE';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          suspendedReason: reason,
        },
      });

      await tx.suspensionHistory.create({
        data: {
          organizationId: id,
          action: 'SUSPENSION',
          reason,
          previousStatus: oldStatus,
          newStatus: 'SUSPENDED',
          performedBy: req.user?.email || 'SuperAdmin',
        },
      });

      return updated;
    });
  }

  @Patch('organizations/:id/reactivate')
  @ApiOperation({ summary: 'Reactivar el servicio de una organización suspendida' })
  async reactivateOrganization(@Param('id') id: string, @Request() req: any) {
    this.assertSuperAdmin(req);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organización no encontrada.');
    }

    const oldStatus = org.status || 'SUSPENDED';

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          reactivatedAt: new Date(),
          suspendedReason: null,
        },
      });

      await tx.suspensionHistory.create({
        data: {
          organizationId: id,
          action: 'REACTIVACION',
          reason: 'Servicio reactivado por SuperAdmin tras regularización',
          previousStatus: oldStatus,
          newStatus: 'ACTIVE',
          performedBy: req.user?.email || 'SuperAdmin',
        },
      });

      return updated;
    });
  }

  @Get('organizations/:id/history')
  @ApiOperation({ summary: 'Obtener historial de suspensiones y reactivaciones de una organización' })
  async getSuspensionHistory(@Param('id') id: string, @Request() req: any) {
    this.assertSuperAdmin(req);

    return this.prisma.suspensionHistory.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete('organizations/:id')
  @ApiOperation({ summary: 'Eliminar una empresa u organización' })
  async deleteOrganization(@Param('id') id: string, @Request() req: any) {
    this.assertSuperAdmin(req);

    await this.prisma.suspensionHistory.deleteMany({ where: { organizationId: id } });
    await this.prisma.user.deleteMany({ where: { organizationId: id } });
    await this.prisma.organization.delete({ where: { id } });
    return { success: true };
  }

  // --- GESTIÓN DE USUARIOS DE LA PLATAFORMA ---

  @Get('users')
  @ApiOperation({ summary: 'Listar todos los usuarios de la plataforma' })
  async getUsers(@Request() req: any) {
    this.assertSuperAdmin(req);
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        organization: {
          select: { id: true, name: true, subscription: true, status: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('users')
  @ApiOperation({ summary: 'Crear usuario asignado a cualquier empresa con rol específico' })
  async createUser(@Body() body: any, @Request() req: any) {
    this.assertSuperAdmin(req);

    if (!body.email || !body.name || !body.organizationId) {
      throw new BadRequestException('Faltan campos obligatorios: email, nombre y empresa.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: String(body.email).trim().toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('El correo ya está en uso.');
    }

    const passwordHash = await bcrypt.hash(body.password || '123456', 10);

    return this.prisma.user.create({
      data: {
        email: String(body.email).trim().toLowerCase(),
        name: String(body.name).trim(),
        passwordHash,
        role: body.role || 'PROPIETARIO',
        organizationId: body.organizationId,
      },
      include: { organization: true },
    });
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Actualizar rol, nombre o contraseña de un usuario' })
  async updateUser(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    this.assertSuperAdmin(req);

    const data: any = {};
    if (body.name) data.name = String(body.name).trim();
    if (body.role) data.role = body.role;
    if (body.organizationId) data.organizationId = body.organizationId;
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: { organization: true },
    });
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Eliminar usuario de la plataforma' })
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    this.assertSuperAdmin(req);

    if (id === req.user?.sub) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta de Superadmin.');
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
