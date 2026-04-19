import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  const app = await NestFactory.create(AppModule);

  // ✅ FORCE CORS + PREFLIGHT FIX
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
  });

  // 🔥 IMPORTANT: handle preflight manually (fixes your exact error)
  app.use(
    (
      req: { method: string },
      res: {
        header: (arg0: string, arg1: string) => void;
        sendStatus: (arg0: number) => any;
      },
      next: () => void,
    ) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      );
      res.header('Access-Control-Allow-Headers', '*');

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // 👈 THIS FIXES PREFLIGHT
      }

      next();
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.get(PrismaService).enableShutdownHooks(app);
  await app.listen(port, host);

  console.log(`🚀 Server running on http://localhost:${port}`);
}

void bootstrap();
