import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { MaquinariaService } from './maquinaria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('maquinaria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maquinaria')
export class MaquinariaController {
  constructor(private machineryService: MaquinariaService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener toda la maquinaria de la organización' })
  async findAll(@Request() req: any) {
    return this.machineryService.findAll(req.user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalles de una maquinaria por su ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.machineryService.findOne(id, req.user.orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva maquinaria' })
  async create(@Body() body: any, @Request() req: any) {
    return this.machineryService.create(req.user.orgId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar estado o mantenimiento de una maquinaria' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.machineryService.update(id, req.user.orgId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una maquinaria' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.machineryService.delete(id, req.user.orgId);
  }
}
