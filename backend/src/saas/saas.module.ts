import { Module } from '@nestjs/common';
import { SaasController } from './saas.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SaasController],
})
export class SaasModule {}
