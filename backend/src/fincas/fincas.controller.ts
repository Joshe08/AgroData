import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { FincasService } from './fincas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('fincas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fincas')
export class FincasController {
  constructor(private fincasService: FincasService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las fincas de la organización' })
  async findAll(@Request() req: any) {
    return this.fincasService.findAll(req.user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una finca por su ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.fincasService.findOne(id, req.user.orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una finca nueva' })
  async create(@Body() body: any, @Request() req: any) {
    return this.fincasService.create(req.user.orgId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una finca existente' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.fincasService.update(id, req.user.orgId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una finca y todos sus lotes' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.fincasService.delete(id, req.user.orgId);
  }

  // Lotes routes
  @Get(':id/lotes')
  @ApiOperation({ summary: 'Obtener todos los lotes de una finca' })
  async findAllLotes(@Param('id') fincaId: string, @Request() req: any) {
    return this.fincasService.findAllLotes(fincaId, req.user.orgId);
  }

  @Post(':id/lotes')
  @ApiOperation({ summary: 'Crear un lote nuevo en una finca' })
  async createLote(@Param('id') fincaId: string, @Body() body: any, @Request() req: any) {
    return this.fincasService.createLote(fincaId, req.user.orgId, body);
  }

  @Delete('lotes/:loteId')
  @ApiOperation({ summary: 'Eliminar un lote específico' })
  async deleteLote(@Param('loteId') loteId: string, @Request() req: any) {
    return this.fincasService.deleteLote(loteId, req.user.orgId);
  }
}
