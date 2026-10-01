import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FincasModule } from './fincas/fincas.module';
import { ProduccionesModule } from './producciones/producciones.module';
import { InventarioModule } from './inventario/inventario.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { PersonalModule } from './personal/personal.module';
import { MaquinariaModule } from './maquinaria/maquinaria.module';
import { ClimaModule } from './clima/clima.module';
import { AiModule } from './ai/ai.module';
import { SaasModule } from './saas/saas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FincasModule,
    ProduccionesModule,
    InventarioModule,
    FinanzasModule,
    PersonalModule,
    MaquinariaModule,
    ClimaModule,
    AiModule,
    SaasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
