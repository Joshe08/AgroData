import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('finanzas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finanzas')
export class FinanzasController {
  constructor(private finanzasService: FinanzasService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Obtener resumen y métricas financieras de la organización' })
  async getMetrics(@Request() req: any) {
    return this.finanzasService.getMetrics(req.user.orgId);
  }

  @Get('resumen')
  @ApiOperation({ summary: 'Alias compatible del resumen financiero' })
  async getResumen(@Request() req: any) {
    return this.finanzasService.getMetrics(req.user.orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener historial de transacciones de ingresos/gastos' })
  async findAll(@Request() req: any) {
    return this.finanzasService.findAll(req.user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalles de una transacción por su ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.finanzasService.findOne(id, req.user.orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo movimiento financiero' })
  async create(@Body() body: any, @Request() req: any) {
    return this.finanzasService.create(req.user.orgId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modificar una transacción financiera' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.finanzasService.update(id, req.user.orgId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un registro de movimiento financiero' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.finanzasService.delete(id, req.user.orgId);
  }
}
