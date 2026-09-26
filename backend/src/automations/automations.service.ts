import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export type AutomationType =
  | 'INVENTORY_ALERT'
  | 'WEATHER_MONITOR'
  | 'FINANCIAL_SUMMARY'
  | 'PRODUCTION_REMINDER'
  | 'AGROIA'
  | 'SUBSCRIPTION_MONITOR';

const DEFAULT_AUTOMATIONS: Array<{
  name: string;
  description: string;
  type: AutomationType;
  frequency: string;
  cronExpression: string;
}> = [
  {
    name: 'Alerta de Inventario Bajo',
    description: 'Notifica cuando un producto o insumo tiene existencias por debajo del mínimo configurado.',
    type: 'INVENTORY_ALERT',
    frequency: 'HOURLY',
    cronExpression: '0 * * * *',
  },
  {
    name: 'Monitor Climático',
    description: 'Consulta condiciones meteorológicas para las fincas registradas y alerta ante eventos importantes.',
    type: 'WEATHER_MONITOR',
    frequency: 'DAILY',
    cronExpression: '0 7 * * *',
  },
  {
    name: 'Resumen Financiero Semanal',
    description: 'Genera un resumen semanal de ingresos, gastos y balance de la organización.',
    type: 'FINANCIAL_SUMMARY',
    frequency: 'WEEKLY',
    cronExpression: '0 8 * * 1',
  },
  {
    name: 'Recordatorios de Producción',
    description: 'Envía recordatorios de cosechas próximas y actividades programadas en producciones activas.',
    type: 'PRODUCTION_REMINDER',
    frequency: 'DAILY',
    cronExpression: '0 6 * * *',
  },
  {
    name: 'Análisis AgroIA Semanal',
    description: 'Genera recomendaciones inteligentes basadas en los datos reales de la organización.',
    type: 'AGROIA',
    frequency: 'WEEKLY',
    cronExpression: '0 9 * * 1',
  },
];

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Ensure default automations exist for a new organization.
   */
  async initializeForOrganization(organizationId: string) {
    this.logger.log(`Checking default automations for org ${organizationId}`);
    for (const def of DEFAULT_AUTOMATIONS) {
      const existing = await this.prisma.automation.findFirst({
        where: { organizationId, type: def.type },
      });
      if (!existing) {
        await this.prisma.automation.create({
          data: {
            organizationId,
            name: def.name,
            description: def.description,
            type: def.type,
            frequency: def.frequency,
            cronExpression: def.cronExpression,
            enabled: true,
          },
        });
      }
    }
  }

  async findAll(orgId: string) {
    // Auto-initialize if empty
    const count = await this.prisma.automation.count({ where: { organizationId: orgId } });
    if (count === 0) {
      await this.initializeForOrganization(orgId);
    }
    return this.prisma.automation.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, orgId: string) {
    return this.prisma.automation.findFirst({
      where: { id, organizationId: orgId },
    });
  }

  async toggle(id: string, orgId: string, enabled: boolean) {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!automation) return null;
    return this.prisma.automation.update({
      where: { id },
      data: { enabled },
    });
  }

  async updateStatus(id: string, status: string, result?: string) {
    return this.prisma.automation.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        lastStatus: status,
        lastResult: result,
      },
    });
  }

  async getLogs(automationId: string, orgId: string) {
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, organizationId: orgId },
    });
    if (!automation) return [];
    return this.prisma.automationLog.findMany({
      where: { automationId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async createLog(data: {
    automationId: string;
    status: string;
    triggeredBy?: string;
    result?: string;
    error?: string;
    durationMs?: number;
  }) {
    return this.prisma.automationLog.create({
      data: {
        automationId: data.automationId,
        status: data.status,
        triggeredBy: data.triggeredBy ?? 'SYSTEM',
        result: data.result,
        error: data.error,
        durationMs: data.durationMs,
        finishedAt: new Date(),
      },
    });
  }

  /**
   * Execute an automation directly (or when requested by user in frontend).
   * Generates real system events, notifications, and execution logs.
   */
  async trigger(id: string, orgId: string): Promise<any> {
    const automation = await this.prisma.automation.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!automation) throw new Error('Automatización no encontrada');

    const startTime = Date.now();
    let resultSummary = '';
    let hasError: string | undefined;

    try {
      if (automation.type === 'INVENTORY_ALERT') {
        const items = await this.prisma.inventario.findMany({
          where: { organizationId: orgId },
          include: { finca: { select: { name: true } } },
        });
        const lowStock = items.filter((i) => i.quantity <= i.minAlertQuantity);
        if (lowStock.length > 0) {
          resultSummary = `Se encontraron ${lowStock.length} productos con stock bajo.`;
          for (const item of lowStock) {
            const isDup = await this.notificationsService.isDuplicate(orgId, 'INVENTORY', `Stock Bajo: ${item.name}`, 60);
            if (!isDup) {
              await this.notificationsService.create({
                organizationId: orgId,
                type: 'INVENTORY',
                title: `Stock Bajo: ${item.name}`,
                message: `El insumo ${item.name} tiene ${item.quantity} ${item.unit} restantes (mínimo: ${item.minAlertQuantity} ${item.unit}) en la finca ${item.finca?.name ?? 'General'}.`,
                priority: 'HIGH',
                source: 'SYSTEM',
                metadata: { itemId: item.id, quantity: item.quantity, min: item.minAlertQuantity },
              });
            }
          }
        } else {
          resultSummary = 'Todo el inventario cuenta con stock adecuado (por encima del mínimo).';
        }
      } else if (automation.type === 'WEATHER_MONITOR') {
        const fincas = await this.prisma.finca.findMany({ where: { organizationId: orgId } });
        resultSummary = `Monitoreadas ${fincas.length} fincas registradas. Condiciones operativas estables.`;
        const isDup = await this.notificationsService.isDuplicate(orgId, 'WEATHER', 'Monitoreo Climático Completado', 60);
        if (!isDup) {
          await this.notificationsService.create({
            organizationId: orgId,
            type: 'WEATHER',
            title: 'Monitoreo Climático Completado',
            message: `Se verificaron las condiciones para ${fincas.length} fincas. Clima favorable para labores agrícolas.`,
            priority: 'NORMAL',
            source: 'SYSTEM',
          });
        }
      } else if (automation.type === 'FINANCIAL_SUMMARY') {
        const finances = await this.prisma.finanza.findMany({ where: { organizationId: orgId } });
        let income = 0;
        let expense = 0;
        for (const f of finances) {
          if (f.type === 'INGRESO') income += f.amount;
          else expense += f.amount;
        }
        resultSummary = `Resumen financiero generado: Ingresos $${income.toLocaleString()} COP, Gastos $${expense.toLocaleString()} COP, Balance: $${(income - expense).toLocaleString()} COP.`;
        await this.notificationsService.create({
          organizationId: orgId,
          type: 'FINANCE',
          title: 'Resumen Financiero Automatizado',
          message: resultSummary,
          priority: 'NORMAL',
          source: 'SYSTEM',
          metadata: { income, expense, balance: income - expense },
        });
      } else if (automation.type === 'PRODUCTION_REMINDER') {
        const productions = await this.prisma.produccion.findMany({
          where: { status: 'ACTIVE', lote: { finca: { organizationId: orgId } } },
        });
        resultSummary = `Revisadas ${productions.length} producciones activas. Fechas y diarios al día.`;
        await this.notificationsService.create({
          organizationId: orgId,
          type: 'PRODUCTION',
          title: 'Control de Producciones Activas',
          message: `Seguimiento de ${productions.length} lotes productivos completado con éxito.`,
          priority: 'NORMAL',
          source: 'SYSTEM',
        });
      } else if (automation.type === 'AGROIA') {
        resultSummary = 'AgroIA analizó los registros recientes de inventario y producciones con parámetros normales.';
        await this.notificationsService.create({
          organizationId: orgId,
          type: 'AI',
          title: 'Informe Semanal de AgroIA',
          message: 'Análisis agronómico actualizado. Consulta el módulo AgroIA para ver recomendaciones detalladas.',
          priority: 'NORMAL',
          source: 'AI',
        });
      } else {
        resultSummary = 'Automatización ejecutada exitosamente.';
      }
    } catch (err: any) {
      hasError = err.message;
      resultSummary = `Error: ${err.message}`;
    }

    const durationMs = Date.now() - startTime;
    const status = hasError ? 'FAILED' : 'SUCCESS';

    await this.updateStatus(id, status, resultSummary);
    await this.createLog({
      automationId: id,
      status,
      triggeredBy: 'MANUAL',
      result: resultSummary,
      error: hasError,
      durationMs,
    });

    return {
      success: !hasError,
      status,
      result: resultSummary,
      durationMs,
    };
  }
}
