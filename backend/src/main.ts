import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Aumentar límite de carga útil para soportar imágenes base64 en análisis fitosanitario de AgroIA
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Asegurar carpeta uploads para fotografías de maquinaria y otros archivos
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  // Servir archivos estáticos: GET /uploads/<filename>
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Global exception filter for error sanitization
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable CORS
  app.enableCors({
    origin: true, // Allow all origins for dev simplicity, configure in production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Setup Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('AgroData Cesar API')
    .setDescription('Plataforma inteligente para la gestión integral de organizaciones agropecuarias')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Use configured port or fallback to 3001
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`\n======================================================`);
  console.log(`AgroData Cesar API is running on: http://0.0.0.0:${port}`);
  console.log(`Interactive Swagger API Docs: http://0.0.0.0:${port}/api`);
  console.log(`Uploads estáticos: http://0.0.0.0:${port}/uploads/`);
  console.log(`======================================================\n`);
}
bootstrap();
