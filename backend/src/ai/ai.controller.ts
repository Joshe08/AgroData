import { Body, Controller, Get, Post, UseGuards, Request, Query } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('advisories')
  @ApiOperation({ summary: 'Obtener recomendaciones del asesor inteligente agrícola IA' })
  async getAdvisories(@Request() req: any) {
    return this.aiService.getAdvisories(req.user.orgId);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat conversacional con AgroIA y acceso total a la base de datos' })
  async chat(@Request() req: any, @Body() body: any) {
    return this.aiService.chat(
      req.user.orgId,
      body.messages || [{ role: 'user', content: body.prompt || '' }],
      body.fincaId,
      body.imageBase64,
    );
  }

  @Post('execute-action')
  @ApiOperation({ summary: 'Ejecutar acción sugerida por AgroIA en la base de datos' })
  async executeAction(@Request() req: any, @Body() body: any) {
    return this.aiService.executeAction(req.user.orgId, body);
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Obtener auditoría e instantánea analítica global de la organización' })
  async getSnapshot(@Request() req: any, @Query('fincaId') fincaId?: string) {
    return this.aiService.getGlobalDatabaseSnapshot(req.user.orgId, fincaId);
  }

  @Post('recomendaciones')
  @ApiOperation({ summary: 'Generar recomendaciones en formato compatible con AgroIA' })
  async getRecomendaciones(@Request() req: any, @Body() body: any) {
    const result = await this.aiService.getCustomRecomendaciones(
      req.user.orgId,
      body?.consulta || '',
      body?.contexto,
    );

    return {
      resumen: result.resumen,
      fuente: process.env.GEMINI_API_KEY ? 'Gemini + datos AgroData' : 'Motor inteligente local AgroData',
      recomendaciones: result.recomendaciones || [],
    };
  }
}
