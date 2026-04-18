import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { AuthenticatedRequest } from './ai.types';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(@Req() req: AuthenticatedRequest, @Body() chatRequestDto: ChatRequestDto) {
    return this.aiService.chat(req.user.id, chatRequestDto.message);
  }
}
