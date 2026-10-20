import {
  Controller, Get, Post, Body, Param, Put, Delete,
  UseGuards, Request, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { MaquinariaService } from './maquinaria.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

// Asegurar que la carpeta uploads exista
const uploadsDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

@ApiTags('maquinaria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maquinaria')
export class MaquinariaController {
  constructor(private machineryService: MaquinariaService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener toda la maquinaria de la organización' })
  async findAll(@Request() req: any) {
    return this.machineryService.findAll(req.user.orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalles de una maquinaria por su ID' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.machineryService.findOne(id, req.user.orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una nueva maquinaria' })
  async create(@Body() body: any, @Request() req: any) {
    return this.machineryService.create(req.user.orgId, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar estado o mantenimiento de una maquinaria' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.machineryService.update(id, req.user.orgId, body);
  }

  @Post(':id/foto')
  @ApiOperation({ summary: 'Subir o reemplazar la fotografía de una maquinaria' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `maq-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|webp|gif)$/i;
        if (!allowed.test(file.originalname)) {
          return cb(new BadRequestException('Solo se permiten imágenes (jpg, jpeg, png, webp, gif)'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
    }),
  )
  async uploadFoto(
    @Param('id') id: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo de imagen');
    }
    return this.machineryService.uploadImage(id, req.user.orgId, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una maquinaria' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.machineryService.delete(id, req.user.orgId);
  }
}
