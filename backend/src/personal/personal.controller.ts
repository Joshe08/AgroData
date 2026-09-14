import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request } from '@nestjs/common';
import { PersonalService } from './personal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('personal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('personal')
export class PersonalController {
  constructor(private personalService: PersonalService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todo el personal de la organización' })
  async findAll(@Request() req: any) {
    return this.personalService.findAll(req.user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalles de un empleado por su ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.personalService.findOne(id, req.user.orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un nuevo empleado' })
  async create(@Body() body: any, @Request() req: any) {
    return this.personalService.create(req.user.orgId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos de un empleado' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.personalService.update(id, req.user.orgId, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar a un empleado de la base de datos' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.personalService.delete(id, req.user.orgId);
  }
}
