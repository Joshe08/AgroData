import { Module } from '@nestjs/common';
import { N8nService } from './n8n.service';
import { N8nWebhookController } from './n8n-webhook.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationsModule } from '../automations/automations.module';
import { InventarioModule } from '../inventario/inventario.module';
import { FinanzasModule } from '../finanzas/finanzas.module';
import { ClimaModule } from '../clima/clima.module';
import { ProduccionesModule } from '../producciones/producciones.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    NotificationsModule,
    AutomationsModule,
    InventarioModule,
    FinanzasModule,
    ClimaModule,
    ProduccionesModule,
    PrismaModule,
  ],
  providers: [N8nService],
  controllers: [N8nWebhookController],
  exports: [N8nService],
})
export class N8nModule {}
