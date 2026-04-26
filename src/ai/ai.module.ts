import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiService } from './ai.service';
import { openAiProvider } from './openai.provider';
import { PredictionService } from './prediction.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiController],
  providers: [AiService, openAiProvider, PredictionService],
  exports: [AiService, PredictionService],
})
export class AiModule {}
