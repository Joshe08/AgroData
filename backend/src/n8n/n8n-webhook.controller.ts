import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { N8nService } from './n8n.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutomationsService } from '../automations/automations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('n8n-webhooks')
@Controller('webhooks/n8n')
export class N8nWebhookController {
  private readonly logger = new Logger(N8nWebhookController.name);

  constructor(
    private n8nService: N8nService,
    private notificationsService: NotificationsService,
    private automationsService: AutomationsService,
    private prisma: PrismaService,
  ) {}

  /**
   * Receive notification creation requests from n8n workflows.
   * n8n → POST /webhooks/n8n/notify
   */
  @Post('notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recibir notificación desde n8n' })
  async receiveNotification(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
    @Headers('x-agrodata-secret') legacySecret: string,
  ) {
    const rawBody = JSON.stringify(body);

    // Verify signature
    if (!this.n8nService.verifyWebhookSignature(rawBody, signature || legacySecret || '')) {
      this.logger.warn('Webhook signature verification failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { organizationId, type, title, message, priority, metadata } = body;

    // Validate organizationId against DB (never trust payload alone)
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new BadRequestException(`Organization ${organizationId} not found`);
    }

    // Deduplicate — avoid spam within 60 minutes for same notification
    const alreadySent = await this.notificationsService.isDuplicate(
      organizationId,
      type,
      title,
      60,
    );
    if (alreadySent) {
      this.logger.log(`Duplicate notification suppressed: [${type}] ${title} for org ${organizationId}`);
      return { success: true, suppressed: true };
    }

    const notification = await this.notificationsService.create({
      organizationId,
      type,
      title,
      message,
      priority: priority ?? 'NORMAL',
      source: 'N8N',
      metadata,
    });

    this.logger.log(`Notification created from n8n: [${type}] ${title}`);
    return { success: true, notificationId: notification.id };
  }

  /**
   * Receive automation execution results from n8n.
   * n8n → POST /webhooks/n8n/automation-result
   */
  @Post('automation-result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recibir resultado de ejecución de automatización desde n8n' })
  async receiveAutomationResult(
    @Body() body: any,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = JSON.stringify(body);
    if (!this.n8nService.verifyWebhookSignature(rawBody, signature || '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { automationId, organizationId, status, result, error, durationMs, triggeredBy } = body;

    // Validate org
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new BadRequestException(`Organization ${organizationId} not found`);

    // Validate automation belongs to org
    const automation = await this.prisma.automation.findFirst({
      where: { id: automationId, organizationId },
    });
    if (!automation) throw new BadRequestException(`Automation ${automationId} not found for org`);

    // Log execution
    await this.automationsService.createLog({
      automationId,
      status,
      result: result ? JSON.stringify(result) : undefined,
      error,
      durationMs,
      triggeredBy: triggeredBy ?? 'N8N',
    });

    // Update automation last run status
    await this.automationsService.updateStatus(
      automationId,
      status,
      result ? JSON.stringify(result) : undefined,
    );

    this.logger.log(`Automation result received: ${automationId} → ${status}`);
    return { success: true };
  }

  /**
   * Internal endpoint for NestJS to provide data to n8n workflows.
   * This allows n8n to pull inventory alert data from AgroData without direct DB access.
   * n8n → POST /webhooks/n8n/data/inventory-alerts
   */
  @Post('data/inventory-alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Proporcionar datos de alertas de inventario para n8n' })
  async getInventoryAlertsForN8n(
    @Body() body: { organizationId: string },
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = JSON.stringify(body);
    if (!this.n8nService.verifyWebhookSignature(rawBody, signature || '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { organizationId } = body;
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new BadRequestException(`Organization not found`);

    // Fetch all inventory items and filter low-stock in memory (SQLite-safe)
    const allItems = await this.prisma.inventario.findMany({
      where: { organizationId },
      include: { finca: { select: { id: true, name: true } } },
    });
    const lowStockItems = allItems.filter((item) => item.quantity <= item.minAlertQuantity);

    return {
      organizationId,
      organizationName: org.name,
      totalAlerts: lowStockItems.length,
      items: lowStockItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        minAlertQuantity: item.minAlertQuantity,
        unit: item.unit,
        finca: item.finca?.name ?? 'Sin finca',
      })),
    };
  }

  /**
   * Data provider for Weather Monitor workflow.
   * n8n → POST /webhooks/n8n/data/weather-monitor
   */
  @Post('data/weather-monitor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Proporcionar datos de fincas y coordenadas para el monitor climático en n8n' })
  async getWeatherMonitorData(
    @Body() body: { organizationId: string },
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = JSON.stringify(body);
    if (!this.n8nService.verifyWebhookSignature(rawBody, signature || '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { organizationId } = body;
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    const fincas = await this.prisma.finca.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        location: true,
        municipio: true,
        departamento: true,
        latitude: true,
        longitude: true,
      },
    });

    return {
      organizationId,
      organizationName: org.name,
      fincasCount: fincas.length,
      fincas: fincas.map((f) => ({
        id: f.id,
        name: f.name,
        location: f.location,
        municipio: f.municipio || f.location,
        latitude: f.latitude,
        longitude: f.longitude,
      })),
    };
  }

  /**
   * Data provider for Financial Summary workflow.
   * n8n → POST /webhooks/n8n/data/financial-summary
   */
  @Post('data/financial-summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Proporcionar resumen financiero para n8n' })
  async getFinancialSummaryData(
    @Body() body: { organizationId: string },
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = JSON.stringify(body);
    if (!this.n8nService.verifyWebhookSignature(rawBody, signature || '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { organizationId } = body;
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    const transactions = await this.prisma.finanza.findMany({
      where: { organizationId },
      orderBy: { date: 'desc' },
      take: 200,
    });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let weeklyIncome = 0;
    let weeklyExpense = 0;
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const t of transactions) {
      const d = new Date(t.date);
      if (t.type === 'INGRESO') {
        totalIncome += t.amount;
        if (d >= startOfWeek) weeklyIncome += t.amount;
        if (d >= startOfMonth) monthlyIncome += t.amount;
      } else {
        totalExpense += t.amount;
        if (d >= startOfWeek) weeklyExpense += t.amount;
        if (d >= startOfMonth) monthlyExpense += t.amount;
      }
    }

    return {
      organizationId,
      organizationName: org.name,
      currency: 'COP',
      weekly: {
        income: weeklyIncome,
        expenses: weeklyExpense,
        balance: weeklyIncome - weeklyExpense,
      },
      monthly: {
        income: monthlyIncome,
        expenses: monthlyExpense,
        balance: monthlyIncome - monthlyExpense,
      },
      total: {
        income: totalIncome,
        expenses: totalExpense,
        balance: totalIncome - totalExpense,
      },
      recentCount: transactions.length,
    };
  }

  /**
   * Data provider for Production Reminders workflow.
   * n8n → POST /webhooks/n8n/data/production-reminders
   */
  @Post('data/production-reminders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Proporcionar producciones y fechas importantes para recordatorios en n8n' })
  async getProductionRemindersData(
    @Body() body: { organizationId: string },
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = JSON.stringify(body);
    if (!this.n8nService.verifyWebhookSignature(rawBody, signature || '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { organizationId } = body;
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    const productions = await this.prisma.produccion.findMany({
      where: {
        status: 'ACTIVE',
        lote: { finca: { organizationId } },
      },
      include: {
        lote: {
          include: {
            finca: { select: { id: true, name: true } },
          },
        },
      },
    });

    const now = new Date();
    const upcomingThreshold = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // next 14 days

    const items = productions.map((p) => {
      const isLivestock = p.type.startsWith('PECUARIA') || p.type.startsWith('AVICOLA') || p.type.startsWith('PISCICOLA') || p.type.startsWith('APICOLA');
      const harvestSoon = p.endDate ? new Date(p.endDate) <= upcomingThreshold && new Date(p.endDate) >= now : false;

      return {
        id: p.id,
        name: p.name,
        type: p.type,
        isLivestock,
        startDate: p.startDate,
        endDate: p.endDate,
        finca: p.lote?.finca?.name ?? 'Sin finca',
        lote: p.lote?.name ?? 'Sin lote',
        harvestSoon,
        daysUntilEnd: p.endDate ? Math.ceil((new Date(p.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
      };
    });

    return {
      organizationId,
      organizationName: org.name,
      activeProductionsCount: productions.length,
      productions: items,
    };
  }

  /**
   * Data provider for Subscription Monitor workflow.
   * n8n → POST /webhooks/n8n/data/subscription-status
   */
  @Post('data/subscription-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Proporcionar estado de suscripción de la organización para n8n' })
  async getSubscriptionStatus(
    @Body() body: { organizationId: string },
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = JSON.stringify(body);
    if (!this.n8nService.verifyWebhookSignature(rawBody, signature || '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { organizationId } = body;
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    return {
      organizationId: org.id,
      name: org.name,
      subscription: org.subscription,
      status: org.status,
      createdAt: org.createdAt,
    };
  }

  /**
   * Data provider for AgroIA Context workflow.
   * n8n → POST /webhooks/n8n/data/ai-context
   */
  @Post('data/ai-context')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Proporcionar contexto completo y verídico de la organización para AgroIA' })
  async getAiContext(
    @Body() body: { organizationId: string },
    @Headers('x-hub-signature-256') signature: string,
  ) {
    const rawBody = JSON.stringify(body);
    if (!this.n8nService.verifyWebhookSignature(rawBody, signature || '')) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { organizationId } = body;
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    const [fincas, productions, inventory, finances] = await Promise.all([
      this.prisma.finca.findMany({ where: { organizationId }, select: { name: true, area: true, location: true } }),
      this.prisma.produccion.findMany({ where: { status: 'ACTIVE', lote: { finca: { organizationId } } }, select: { name: true, type: true, startDate: true, endDate: true } }),
      this.prisma.inventario.findMany({ where: { organizationId }, select: { name: true, quantity: true, unit: true, minAlertQuantity: true } }),
      this.prisma.finanza.findMany({ where: { organizationId }, take: 50, select: { type: true, amount: true, category: true, date: true } }),
    ]);

    const lowStock = inventory.filter((i) => i.quantity <= i.minAlertQuantity);
    let totalIncome = 0;
    let totalExpense = 0;
    for (const f of finances) {
      if (f.type === 'INGRESO') totalIncome += f.amount;
      else totalExpense += f.amount;
    }

    return {
      organization: { id: org.id, name: org.name, subscription: org.subscription },
      fincasCount: fincas.length,
      fincasSummary: fincas.map((f) => `${f.name} (${f.area} ha en ${f.location})`).join(', '),
      activeProductions: productions.map((p) => `${p.name} [${p.type}]`),
      lowStockAlerts: lowStock.map((i) => `${i.name}: ${i.quantity} ${i.unit} (mínimo: ${i.minAlertQuantity})`),
      financialBalance: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
      },
    };
  }
}
