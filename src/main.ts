import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

function parseFrontendOrigins(): string[] {
  return (process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function shouldAllowVercelPreviewOrigins(): boolean {
  return (process.env.ALLOW_VERCEL_PREVIEWS ?? 'false').toLowerCase() === 'true';
}

function isAllowedOrigin(
  origin: string,
  allowedOrigins: string[],
  allowVercelPreviews: boolean,
): boolean {
  if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
    return true;
  }

  if (!allowVercelPreviews) {
    return false;
  }

  try {
    const url = new URL(origin);
    return url.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

async function bootstrap() {
  const frontendOrigins = parseFrontendOrigins();
  const allowVercelPreviews = shouldAllowVercelPreviewOrigins();
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (
        !origin ||
        isAllowedOrigin(origin, frontendOrigins, allowVercelPreviews)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.get(PrismaService).enableShutdownHooks(app);
  await app.listen(port, host);
}

void bootstrap();
