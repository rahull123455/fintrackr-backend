import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  const app = await NestFactory.create(AppModule);

  // ✅ FIXED CORS (WORKS WITH VERCEL + RENDER)
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // ✅ Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // ✅ Prisma shutdown hook
  await app.get(PrismaService).enableShutdownHooks(app);

  await app.listen(port, host);

  console.log(`🚀 Server running on http://localhost:${port}`);
}

void bootstrap();
