import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ExpensesModule } from './expenses/expenses.module';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [PrismaModule, AuthModule, ExpensesModule, AiModule, ContactModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
