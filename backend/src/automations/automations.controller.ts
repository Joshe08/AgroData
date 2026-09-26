import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutomationsService } from './automations.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('automations')
export class AutomationsController {
  private readonly logger = new Logger(AutomationsController.name);

  constructor(private automationsService: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar automatizaciones de la organización' })
  async findAll(@Request() req: any) {
    return this.automationsService.findAll(req.user.orgId);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Obtener historial de ejecuciones de una automatización' })
  async getLogs(@Param('id') id: string, @Request() req: any) {
    return this.automationsService.getLogs(id, req.user.orgId);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activar o desactivar una automatización' })
  async toggle(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
    @Request() req: any,
  ) {
    return this.automationsService.toggle(id, req.user.orgId, body.enabled);
  }

  @Patch(':id/trigger')
  @ApiOperation({ summary: 'Ejecutar manualmente una automatización' })
  async trigger(@Param('id') id: string, @Request() req: any) {
    return this.automationsService.trigger(id, req.user.orgId);
  }
}
