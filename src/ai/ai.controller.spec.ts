import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let aiService: { chat: jest.Mock };

  beforeEach(async () => {
    aiService = {
      chat: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: aiService,
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('delegates the user id and message to the service', async () => {
    aiService.chat.mockResolvedValue({
      reply: 'Trim your restaurant spending next month.',
      analysis: {
        expenseCount: 2,
        totalSpend: 100,
        averageExpense: 50,
        firstExpenseAt: '2026-04-01T00:00:00.000Z',
        lastExpenseAt: '2026-04-10T00:00:00.000Z',
        topCategories: [],
        recentExpenses: [],
      },
    });

    const result = await controller.chat(
      { user: { id: 'user-123' } },
      { message: 'How can I save more?' },
    );

    expect(aiService.chat).toHaveBeenCalledWith(
      'user-123',
      'How can I save more?',
    );
    expect(result.reply).toBe('Trim your restaurant spending next month.');
  });
});
