import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener notificaciones de la organización' })
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  async findAll(@Request() req: any, @Query('unread') unread?: string) {
    const orgId: string = req.user.orgId;
    return this.notificationsService.findAll(orgId, unread === 'true');
  }

  @Get('count/unread')
  @ApiOperation({ summary: 'Obtener conteo de notificaciones sin leer' })
  async getUnreadCount(@Request() req: any) {
    const orgId: string = req.user.orgId;
    const count = await this.notificationsService.findUnreadCount(orgId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const orgId: string = req.user.orgId;
    await this.notificationsService.markAsRead(id, orgId);
    return { success: true };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  async markAllAsRead(@Request() req: any) {
    const orgId: string = req.user.orgId;
    await this.notificationsService.markAllAsRead(orgId);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar notificación' })
  async delete(@Param('id') id: string, @Request() req: any) {
    const orgId: string = req.user.orgId;
    await this.notificationsService.delete(id, orgId);
    return { success: true };
  }
}
