import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { OPENAI_CLIENT } from './ai.constants';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  let prismaService: {
    expense: {
      findMany: jest.Mock;
    };
  };
  let openaiClient: {
    chat: {
      completions: {
        create: jest.Mock;
      };
    };
  };

  beforeEach(async () => {
    prismaService = {
      expense: {
        findMany: jest.fn(),
      },
    };

    openaiClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: OPENAI_CLIENT,
          useValue: openaiClient,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('builds expense context and returns assistant advice', async () => {
    prismaService.expense.findMany.mockResolvedValue([
      {
        title: 'Groceries',
        amount: 125.5,
        category: 'Food',
        spentAt: new Date('2026-04-10T00:00:00.000Z'),
      },
      {
        title: 'Streaming',
        amount: 19.99,
        category: 'Subscriptions',
        spentAt: new Date('2026-04-05T00:00:00.000Z'),
      },
      {
        title: 'Coffee',
        amount: 15,
        category: 'Food',
        spentAt: new Date('2026-04-03T00:00:00.000Z'),
      },
    ]);
    openaiClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Food is your largest category. Set a weekly dining cap.',
          },
        },
      ],
    });

    const result = await service.chat('user-1', 'How can I spend less?');

    expect(prismaService.expense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { spentAt: 'desc' },
      select: {
        title: true,
        amount: true,
        category: true,
        spentAt: true,
      },
    });

    expect(openaiClient.chat.completions.create).toHaveBeenCalledTimes(1);

    const request = openaiClient.chat.completions.create.mock.calls[0][0] as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };

    expect(request.model).toBe('gpt-4o-mini');
    expect(request.messages[1].content).toContain('How can I spend less?');
    expect(request.messages[1].content).toContain('Food: $140.50');

    expect(result).toEqual({
      reply: 'Food is your largest category. Set a weekly dining cap.',
      analysis: {
        expenseCount: 3,
        totalSpend: 160.49,
        averageExpense: 53.5,
        firstExpenseAt: '2026-04-03T00:00:00.000Z',
        lastExpenseAt: '2026-04-10T00:00:00.000Z',
        topCategories: [
          {
            category: 'Food',
            amount: 140.5,
            shareOfTotal: 87.5,
          },
          {
            category: 'Subscriptions',
            amount: 19.99,
            shareOfTotal: 12.5,
          },
        ],
        recentExpenses: [
          {
            title: 'Groceries',
            amount: 125.5,
            category: 'Food',
            spentAt: '2026-04-10T00:00:00.000Z',
          },
          {
            title: 'Streaming',
            amount: 19.99,
            category: 'Subscriptions',
            spentAt: '2026-04-05T00:00:00.000Z',
          },
          {
            title: 'Coffee',
            amount: 15,
            category: 'Food',
            spentAt: '2026-04-03T00:00:00.000Z',
          },
        ],
      },
    });
  });

  it('fails fast when the OpenAI client is not configured', async () => {
    const unconfiguredService = new AiService(
      prismaService as unknown as PrismaService,
      null,
    );

    await expect(
      unconfiguredService.chat('user-1', 'Can you help me budget?'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prismaService.expense.findMany).not.toHaveBeenCalled();
  });

  it('throws when OpenAI returns an empty message', async () => {
    prismaService.expense.findMany.mockResolvedValue([]);
    openaiClient.chat.completions.create.mockResolvedValue({
      choices: [
        {
          message: {
            content: '',
          },
        },
      ],
    });

    await expect(service.chat('user-1', 'Any advice?')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
