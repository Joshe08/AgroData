import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  console.log(`======================================================\n`);
}
bootstrap();
