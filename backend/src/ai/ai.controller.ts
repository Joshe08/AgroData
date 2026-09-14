import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
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
