import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && user.passwordHash) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        const { passwordHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role, orgId: user.organizationId };
    // Fetch organizationName if not already included
    let organizationName = user.organization?.name || user.organizationName;
    if (!organizationName && user.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { name: true },
      });
      organizationName = org?.name;
    }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName,
      },
    };
  }

  async loginWithGoogle(email: string, name: string) {
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      // Auto-register flow for Google users
      // Create a default organization for the new user
      const org = await this.prisma.organization.create({
        data: {
          name: `Organización de ${name}`,
          subscription: 'FREE',
        },
      });

      // Create the user associated with the new organization as PROPIETARIO
      const newUser = await this.usersService.create({
        email,
        name,
        role: 'PROPIETARIO',
        organizationId: org.id,
      });

      // Re-fetch user to include organization relation
      const fetched = await this.usersService.findById(newUser.id);
      if (!fetched) {
        throw new UnauthorizedException('Error al registrar usuario de Google');
      }
      user = fetched;
    }

    return this.login(user);
  }

  async register(email: string, pass: string, name: string, orgName: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new UnauthorizedException('El correo ya está registrado');
    }

    const org = await this.prisma.organization.create({
      data: {
        name: orgName || `Organización de ${name}`,
        subscription: 'FREE',
      },
    });

    const passwordHash = await bcrypt.hash(pass, 10);
    const user = await this.usersService.create({
      email,
      name,
      passwordHash,
      role: 'PROPIETARIO',
      organizationId: org.id,
    });

    const fetched = await this.usersService.findById(user.id);
    return this.login(fetched || user);
  }
}
