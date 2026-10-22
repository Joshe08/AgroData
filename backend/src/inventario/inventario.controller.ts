import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventario')
export class InventarioController {
  constructor(private inventarioService: InventarioService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener el inventario de la organización (opcionalmente filtrado por finca)' })
  @ApiQuery({ name: 'fincaId', required: false, description: 'ID de la finca para filtrar la bodega' })
  async findAll(@Request() req: any, @Query('fincaId') fincaId?: string) {
    return this.inventarioService.findAll(req.user.orgId, fincaId);
  }

  @Get('alertas')
  @ApiOperation({ summary: 'Obtener items de inventario con stock bajo' })
  @ApiQuery({ name: 'fincaId', required: false, description: 'ID de la finca para filtrar alertas' })
  async findAlertas(@Request() req: any, @Query('fincaId') fincaId?: string) {
    return this.inventarioService.findAlertas(req.user.orgId, fincaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un elemento de inventario por su ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.inventarioService.findOne(id, req.user.orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un elemento nuevo en el inventario' })
  async create(@Body() body: any, @Request() req: any) {
    return this.inventarioService.create(req.user.orgId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar la cantidad o datos de un elemento de inventario' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.inventarioService.update(id, req.user.orgId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un elemento del inventario' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.inventarioService.delete(id, req.user.orgId);
  }
}
