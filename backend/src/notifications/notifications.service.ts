import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
  organizationId: string;
  userId?: string;
  type: 'WEATHER' | 'INVENTORY' | 'PRODUCTION' | 'FINANCE' | 'AI' | 'SUBSCRIPTION' | 'SYSTEM';
  title: string;
  message: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  source?: 'SYSTEM' | 'N8N' | 'AI';
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNotificationDto) {
    this.logger.log(`Creating notification [${dto.type}] for org ${dto.organizationId}: ${dto.title}`);
    return this.prisma.notification.create({
      data: {
        organizationId: dto.organizationId,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        priority: dto.priority ?? 'NORMAL',
        source: dto.source ?? 'SYSTEM',
        metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
      },
    });
  }

  async findAll(orgId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        organizationId: orgId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findUnreadCount(orgId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { organizationId: orgId, read: false },
    });
  }

  async markAsRead(id: string, orgId: string) {
    return this.prisma.notification.updateMany({
      where: { id, organizationId: orgId },
      data: { read: true },
    });
  }

  async markAllAsRead(orgId: string) {
    return this.prisma.notification.updateMany({
      where: { organizationId: orgId, read: false },
      data: { read: true },
    });
  }

  async delete(id: string, orgId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, organizationId: orgId },
    });
  }

  /**
   * Check for duplicate notification within time window to avoid spam.
   * Returns true if a similar notification was already sent within the windowMinutes.
   */
  async isDuplicate(orgId: string, type: string, titleKey: string, windowMinutes = 60): Promise<boolean> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const existing = await this.prisma.notification.findFirst({
      where: {
        organizationId: orgId,
        type,
        title: titleKey,
        createdAt: { gte: since },
      },
    });
    return existing !== null;
  }
}
