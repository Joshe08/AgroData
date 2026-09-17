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
  @ApiOperation({ summary: 'Obtener clima actual para una ciudad o coordenadas GPS de finca' })
  async getCurrentWeather(
    @Query('ciudad') ciudad?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
  ) {
    const numLat = lat ? parseFloat(lat) : undefined;
    const numLon = lon ? parseFloat(lon) : undefined;
    return this.climaService.getCurrentWeather(ciudad, numLat, numLon);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Obtener pronóstico de clima para una ciudad o coordenadas GPS de finca' })
  async getForecast(
    @Query('ciudad') ciudad?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
  ) {
    const numLat = lat ? parseFloat(lat) : undefined;
    const numLon = lon ? parseFloat(lon) : undefined;
    return this.climaService.getForecast(ciudad, numLat, numLon);
  }
}
