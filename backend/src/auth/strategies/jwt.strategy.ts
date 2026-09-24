import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'agrodata-secret-key-2024',
    });
  }

  async validate(payload: any) {
    if (payload.role !== 'SUPERADMIN' && payload.orgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: payload.orgId },
        select: { status: true },
      });
      if (org && org.status === 'SUSPENDED') {
        throw new ForbiddenException(
          'El acceso a esta organización se encuentra suspendido. Comunícate con el administrador de la plataforma.'
        );
      }
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      orgId: payload.orgId,
    };
  }
}
