import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión con correo y contraseña' })
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo productor y su organización' })
  async register(@Body() body: any) {
    if (!body.email || !body.password || !body.name) {
      throw new UnauthorizedException('Datos incompletos para el registro');
    }
    return this.authService.register(body.email, body.password, body.name, body.organizationName);
  }

  @Post('google')
  @ApiOperation({ summary: 'Iniciar sesión o registrarse con Google' })
  async googleLogin(@Body() body: any) {
    if (!body.email || !body.name) {
      throw new UnauthorizedException('Datos de Google inválidos');
    }
    return this.authService.loginWithGoogle(body.email, body.name);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Alias compatible para obtener el usuario autenticado' })
  async getMe(@Request() req: any) {
    return req.user;
  }
}
