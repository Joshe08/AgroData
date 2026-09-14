import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { ProduccionesService } from './producciones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('producciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('producciones')
export class ProduccionesController {
  constructor(private produccionesService: ProduccionesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las producciones de la organización' })
  async findAll(@Request() req: any) {
    return this.produccionesService.findAll(req.user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una producción por su ID y su historial' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.produccionesService.findOne(id, req.user.orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una producción nueva en un lote' })
  async create(@Body() body: any, @Request() req: any) {
    return this.produccionesService.create(body, req.user.orgId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una producción (ej. estado o rendimiento)' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.produccionesService.update(id, body, req.user.orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una producción y sus registros de diario' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.produccionesService.delete(id, req.user.orgId);
  }

  // Diario de producción
  @Post(':id/diarios')
  @ApiOperation({ summary: 'Añadir una actividad al diario de la producción' })
  async createDiario(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.produccionesService.createDiario(id, body, req.user.orgId);
  }

  @Delete('diarios/:diarioId')
  @ApiOperation({ summary: 'Eliminar una actividad específica de diario' })
  async deleteDiario(@Param('diarioId') diarioId: string, @Request() req: any) {
    return this.produccionesService.deleteDiario(diarioId, req.user.orgId);
  }
}
