import { Module } from '@nestjs/common';
import { MaquinariaService } from './maquinaria.service';
import { MaquinariaController } from './maquinaria.controller';

@Module({
  providers: [MaquinariaService],
  controllers: [MaquinariaController],
  exports: [MaquinariaService],
})
export class MaquinariaModule {}
