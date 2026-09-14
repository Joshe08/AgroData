import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../generated/client/enums';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { organization: true },
    });
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash?: string;
    role?: UserRole;
    organizationId: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role || 'TRABAJADOR',
        organizationId: data.organizationId,
      },
    });
  }
}
