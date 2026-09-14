import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ClimaService } from './clima.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('clima')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clima')
export class ClimaController {
  constructor(private climaService: ClimaService) {}

  @Get('current')
  @ApiOperation({ summary: 'Obtener clima actual para una ciudad del Cesar' })
  async getCurrentWeather(@Query('ciudad') ciudad: string) {
    return this.climaService.getCurrentWeather(ciudad || 'Valledupar');
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Obtener pronóstico de clima para una ciudad del Cesar' })
  async getForecast(@Query('ciudad') ciudad: string) {
    return this.climaService.getForecast(ciudad || 'Valledupar');
  }
}
