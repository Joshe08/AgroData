import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener el perfil del usuario actual' })
  async getMe(@Request() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            subscription: true,
            nit: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  @Put('me')
  @ApiOperation({ summary: 'Actualizar perfil del usuario actual' })
  async updateMe(@Body() body: any, @Request() req: any) {
    const data: any = {};
    if (body.name && body.name.trim().length > 0) {
      data.name = body.name.trim();
    }
    if (body.password && body.password.length >= 6) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }
    const updated = await this.prisma.user.update({
      where: { id: req.user.sub },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            subscription: true,
          },
        },
      },
    });
    return updated;
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los colaboradores de la organización' })
  async findAll(@Request() req: any) {
    return this.prisma.user.findMany({
      where: { organizationId: req.user.orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  @Post()
  @ApiOperation({ summary: 'Agregar un nuevo colaborador a la organización' })
  async create(@Body() body: any, @Request() req: any) {
    // Only PROPIETARIO and ADMIN can invite/add users
    if (req.user.role !== 'PROPIETARIO' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('No tienes permiso para agregar usuarios a esta organización');
    }

    if (!body.email || !body.name) {
      throw new BadRequestException('El nombre y correo electrónico son obligatorios');
    }

    // Validar límites de usuarios según el plan de suscripción
    const org = await this.prisma.organization.findUnique({
      where: { id: req.user.orgId },
      select: { subscription: true },
    });

    const currentUsersCount = await this.prisma.user.count({
      where: { organizationId: req.user.orgId },
    });

    const plan = org?.subscription || 'FREE';
    if (plan === 'FREE' && currentUsersCount >= 2) {
      throw new BadRequestException(
        'El Plan FREE permite hasta 2 usuarios colaboradores. Actualiza a PREMIUM para ampliar tu equipo.'
      );
    } else if (plan === 'PREMIUM' && currentUsersCount >= 10) {
      throw new BadRequestException(
        'El Plan PREMIUM permite hasta 10 usuarios. Actualiza a ENTERPRISE para colaboradores ilimitados.'
      );
    }

    const existing = await this.usersService.findByEmail(body.email.trim().toLowerCase());
    if (existing) {
      throw new BadRequestException('El correo electrónico ya está registrado en la plataforma');
    }

    const passwordHash = await bcrypt.hash(body.password || '123456', 10);

    return this.prisma.user.create({
      data: {
        email: body.email.trim().toLowerCase(),
        name: body.name.trim(),
        passwordHash,
        role: body.role || 'TRABAJADOR',
        organizationId: req.user.orgId,
      },
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar rol o detalles de un colaborador' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    if (req.user.role !== 'PROPIETARIO' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('No tienes permiso para modificar usuarios');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.organizationId !== req.user.orgId) {
      throw new NotFoundException('Usuario no encontrado en esta organización');
    }

    // Do not allow changing the role of the PROPIETARIO unless the requester is the PROPIETARIO
    if (user.role === 'PROPIETARIO' && req.user.role !== 'PROPIETARIO') {
      throw new ForbiddenException('No puedes cambiar el rol del Propietario');
    }

    const data: any = {};
    if (body.name) data.name = body.name;
    if (body.role) data.role = body.role;
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un colaborador de la organización' })
  async remove(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'PROPIETARIO' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException('No tienes permiso para eliminar usuarios');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.organizationId !== req.user.orgId) {
      throw new NotFoundException('Usuario no encontrado en esta organización');
    }

    if (user.id === req.user.sub) {
      throw new ForbiddenException('No puedes eliminarte a ti mismo de la organización');
    }

    if (user.role === 'PROPIETARIO') {
      throw new ForbiddenException('No se puede eliminar al Propietario de la organización');
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
