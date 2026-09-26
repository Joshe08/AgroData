import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly n8nBaseUrl: string;
  private readonly n8nApiKey: string;
  private readonly webhookSecret: string;

  constructor(private config: ConfigService) {
    this.n8nBaseUrl = this.config.get<string>('N8N_BASE_URL', 'http://localhost:5678');
    this.n8nApiKey = this.config.get<string>('N8N_API_KEY', '');
    this.webhookSecret = this.config.get<string>('N8N_WEBHOOK_SECRET', '');
  }

  /**
   * Verify that a webhook request comes from n8n using HMAC signature or shared secret.
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('N8N_WEBHOOK_SECRET is not set — skipping signature validation (dev mode)');
      return true;
    }
    if (!signature) {
      return false;
    }
    const cleanSig = signature.replace('sha256=', '').trim();
    // Allow direct secret matching (useful for simple webhook headers or development)
    if (cleanSig === this.webhookSecret) {
      return true;
    }

    try {
      const expectedSig = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const sigBuffer = Buffer.from(cleanSig, 'hex');
      const expBuffer = Buffer.from(expectedSig, 'hex');

      if (sigBuffer.length !== expBuffer.length || sigBuffer.length === 0) {
        return false;
      }
      return crypto.timingSafeEqual(sigBuffer, expBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Trigger an n8n workflow via its webhook URL.
   * Returns true if the trigger was successful.
   */
  async triggerWorkflow(webhookPath: string, payload: Record<string, any>): Promise<boolean> {
    if (!this.n8nBaseUrl || !this.n8nApiKey) {
      this.logger.warn(`N8N not configured — skipping trigger for webhook: ${webhookPath}`);
      return false;
    }
    const url = `${this.n8nBaseUrl}/webhook/${webhookPath}`;
    try {
      const signature = this.webhookSecret
        ? 'sha256=' + crypto.createHmac('sha256', this.webhookSecret).update(JSON.stringify(payload)).digest('hex')
        : '';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.n8nApiKey,
          ...(signature ? { 'X-Hub-Signature-256': signature } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        this.logger.error(`n8n webhook ${webhookPath} returned ${response.status}`);
        return false;
      }
      this.logger.log(`n8n workflow triggered: ${webhookPath}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to trigger n8n workflow ${webhookPath}: ${err.message}`);
      return false;
    }
  }

  /**
   * Emit an internal event to n8n.
   * Maps event types to webhook paths.
   */
  async emitEvent(event: string, payload: Record<string, any>): Promise<void> {
    const webhookMap: Record<string, string> = {
      'inventory.low_stock': 'agrodata-inventory-alert',
      'weather.alert': 'agrodata-weather-alert',
      'finance.summary_requested': 'agrodata-financial-summary',
      'production.reminder': 'agrodata-production-reminder',
      'ai.insights_requested': 'agrodata-agroia-insights',
      'organization.subscription_expiring': 'agrodata-subscription-monitor',
    };
    const webhookPath = webhookMap[event];
    if (webhookPath) {
      await this.triggerWorkflow(webhookPath, { event, ...payload });
    } else {
      this.logger.warn(`No webhook mapped for event: ${event}`);
    }
  }
}
