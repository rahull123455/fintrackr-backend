import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_OPENAI_MODEL,
  FINANCE_ASSISTANT_SYSTEM_PROMPT,
  MAX_RECENT_EXPENSES,
  MAX_TOP_CATEGORIES,
  OPENAI_CLIENT,
} from './ai.constants';
import {
  AiChatResponse,
  ExpenseAnalysisSnapshot,
  ExpenseCategoryInsight,
} from './ai.types';

type ExpenseRecord = {
  title: string;
  amount: unknown;
  category: string;
  spentAt: Date;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI | null,
  ) {}

  async chat(userId: string, message: string): Promise<AiChatResponse> {
    if (!this.openai) {
      throw new ServiceUnavailableException(
        'AI assistant is not configured. Set OPENAI_API_KEY to enable it.',
      );
    }

    const expenseAnalysis = await this.buildExpenseAnalysis(userId);
    const prompt = this.buildPrompt(message, expenseAnalysis);

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: FINANCE_ASSISTANT_SYSTEM_PROMPT,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.4,
      });

      const reply = completion.choices[0]?.message?.content?.trim();

      if (!reply) {
        throw new InternalServerErrorException(
          'OpenAI returned an empty reply',
        );
      }

      return {
        reply,
        analysis: expenseAnalysis,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `OpenAI API call failed: ${this.getErrorMessage(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Unable to generate financial advice right now.',
      );
    }
  }

  private async buildExpenseAnalysis(
    userId: string,
  ): Promise<ExpenseAnalysisSnapshot> {
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
      orderBy: { spentAt: 'desc' },
      select: {
        title: true,
        amount: true,
        category: true,
        spentAt: true,
      },
    });

    const normalizedExpenses = expenses.map((expense: ExpenseRecord) => ({
      title: expense.title,
      amount: this.roundCurrency(Number(expense.amount)),
      category: expense.category,
      spentAt: expense.spentAt,
    }));

    const expenseCount = normalizedExpenses.length;
    const totalSpend = this.roundCurrency(
      normalizedExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    );
    const averageExpense =
      expenseCount === 0
        ? 0
        : this.roundCurrency(totalSpend / Math.max(expenseCount, 1));
    const newestExpense = expenseCount > 0 ? normalizedExpenses[0] : null;
    const oldestExpense =
      expenseCount > 0 ? normalizedExpenses[expenseCount - 1] : null;

    return {
      expenseCount,
      totalSpend,
      averageExpense,
      firstExpenseAt: oldestExpense?.spentAt.toISOString() ?? null,
      lastExpenseAt: newestExpense?.spentAt.toISOString() ?? null,
      topCategories: this.buildTopCategories(normalizedExpenses, totalSpend),
      recentExpenses: normalizedExpenses
        .slice(0, MAX_RECENT_EXPENSES)
        .map((expense) => ({
          title: expense.title,
          amount: expense.amount,
          category: expense.category,
          spentAt: expense.spentAt.toISOString(),
        })),
    };
  }

  private buildTopCategories(
    expenses: Array<{ amount: number; category: string }>,
    totalSpend: number,
  ): ExpenseCategoryInsight[] {
    const categoryTotals = new Map<string, number>();

    for (const expense of expenses) {
      categoryTotals.set(
        expense.category,
        (categoryTotals.get(expense.category) ?? 0) + expense.amount,
      );
    }

    return Array.from(categoryTotals.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, MAX_TOP_CATEGORIES)
      .map(([category, amount]) => ({
        category,
        amount: this.roundCurrency(amount),
        shareOfTotal:
          totalSpend === 0
            ? 0
            : Number(((amount / totalSpend) * 100).toFixed(1)),
      }));
  }

  private buildPrompt(
    message: string,
    expenseAnalysis: ExpenseAnalysisSnapshot,
  ): string {
    const topCategoryLines =
      expenseAnalysis.topCategories.length > 0
        ? expenseAnalysis.topCategories.map(
            (category) =>
              `- ${category.category}: $${category.amount.toFixed(2)} (${category.shareOfTotal.toFixed(1)}% of total spend)`,
          )
        : ['- No category data is available yet.'];

    const recentExpenseLines =
      expenseAnalysis.recentExpenses.length > 0
        ? expenseAnalysis.recentExpenses.map(
            (expense) =>
              `- ${expense.spentAt.slice(0, 10)} | ${expense.category} | ${expense.title} | $${expense.amount.toFixed(2)}`,
          )
        : ['- No expenses have been recorded yet.'];

    const coverageLine =
      expenseAnalysis.firstExpenseAt && expenseAnalysis.lastExpenseAt
        ? `${expenseAnalysis.firstExpenseAt.slice(0, 10)} to ${expenseAnalysis.lastExpenseAt.slice(0, 10)}`
        : 'No recorded expense history yet';

    return [
      `User question: ${message}`,
      '',
      'Expense summary:',
      `- Total expenses: ${expenseAnalysis.expenseCount}`,
      `- Total spend: $${expenseAnalysis.totalSpend.toFixed(2)}`,
      `- Average expense: $${expenseAnalysis.averageExpense.toFixed(2)}`,
      `- Coverage: ${coverageLine}`,
      '',
      'Top spending categories:',
      ...topCategoryLines,
      '',
      'Most recent expenses:',
      ...recentExpenseLines,
      '',
      'Response requirements:',
      '- Base the answer only on the question and expense data above.',
      '- Give direct, practical financial advice in plain language.',
      '- Mention concrete spending patterns when the data supports them.',
      '- If there is not enough expense history, say that briefly instead of guessing.',
    ].join('\n');
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
