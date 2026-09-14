import { Module } from '@nestjs/common';
import { ClimaService } from './clima.service';
import { ClimaController } from './clima.controller';

@Module({
  providers: [ClimaService],
  controllers: [ClimaController],
  exports: [ClimaService],
})
export class ClimaModule {}
