import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/authenticated-request.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { PredictionService } from './prediction.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly predictionService: PredictionService,
  ) {}

  @Post('chat')
  chat(
    @Req() req: AuthenticatedRequest,
    @Body() chatRequestDto: ChatRequestDto,
  ) {
    return this.aiService.chat(req.user.id, chatRequestDto.message);
  }

  @Get('predict')
  predict(@Req() req: AuthenticatedRequest) {
    return this.predictionService.getPrediction(req.user.id);
  }

  @Post('predict/refresh')
  refreshPrediction(@Req() req: AuthenticatedRequest) {
    return this.predictionService.refreshPrediction(req.user.id);
  }
}
