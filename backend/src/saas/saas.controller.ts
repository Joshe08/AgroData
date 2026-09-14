import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
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

    const [totalOrgs, totalUsers, subscriptions] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.organization.groupBy({
        by: ['subscription'],
        _count: { subscription: true },
      }),
    ]);

    const orgs = await this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        nit: true,
        subscription: true,
        createdAt: true,
        _count: {
          select: { users: true, fincas: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalOrganizaciones: totalOrgs,
      totalUsuarios: totalUsers,
      suscripciones: subscriptions.map((s) => ({
        plan: s.subscription,
        cantidad: s._count.subscription,
      })),
      organizaciones: orgs.map((o) => ({
        id: o.id,
        nombre: o.name,
        nit: o.nit,
        plan: o.subscription,
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

    if (!body.name) {
      throw new BadRequestException('El nombre de la empresa es obligatorio.');
    }

    const org = await this.prisma.organization.create({
      data: {
        name: body.name,
        nit: body.nit || null,
        subscription: body.subscription || 'FREE',
      },
    });

    // If owner credentials provided, create the initial owner user
    if (body.ownerEmail && body.ownerName) {
      const existingUser = await this.prisma.user.findUnique({ where: { email: body.ownerEmail } });
      if (existingUser) {
        throw new BadRequestException('El correo del propietario ya está registrado en otra cuenta.');
      }
      const passwordHash = await bcrypt.hash(body.ownerPassword || '123456', 10);
      await this.prisma.user.create({
        data: {
          email: body.ownerEmail,
          name: body.ownerName,
          passwordHash,
          role: 'PROPIETARIO',
          organizationId: org.id,
        },
      });
    }

    return org;
  }

  @Put('organizations/:id')
  @ApiOperation({ summary: 'Actualizar empresa u organización' })
  async updateOrganization(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    this.assertSuperAdmin(req);

    const data: any = {};
    if (body.name) data.name = body.name;
    if (body.nit !== undefined) data.nit = body.nit;
    if (body.subscription) data.subscription = body.subscription;

    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  @Delete('organizations/:id')
  @ApiOperation({ summary: 'Eliminar una empresa u organización' })
  async deleteOrganization(@Param('id') id: string, @Request() req: any) {
    this.assertSuperAdmin(req);

    // Delete related records
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
          select: { id: true, name: true, subscription: true },
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

    const existing = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new BadRequestException('El correo ya está en uso.');
    }

    const passwordHash = await bcrypt.hash(body.password || '123456', 10);

    return this.prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
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
    if (body.name) data.name = body.name;
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

