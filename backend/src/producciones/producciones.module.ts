import { Module } from '@nestjs/common';
import { ProduccionesService } from './producciones.service';
import { ProduccionesController } from './producciones.controller';

@Module({
  providers: [ProduccionesService],
  controllers: [ProduccionesController],
  exports: [ProduccionesService],
})
export class ProduccionesModule {}
