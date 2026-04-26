import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_OPENAI_MODEL, OPENAI_CLIENT } from './ai.constants';
import {
  CategoryPrediction,
  PredictionConfidence,
  PredictionResponse,
  PredictionTrend,
} from './dto/prediction-response.dto';
import {
  formatMonthKey,
  MonthBucket,
  bucketByMonth,
} from './queries/bucket-by-month';
import { CategoryTrend, detectTrends } from './queries/detect-trends';
import {
  ExpenseCategoryTotal,
  fetchExpenseHistory,
} from './queries/fetch-expense-history.query';

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OPENAI_CLIENT) private readonly openai: OpenAI | null,
  ) {}

  async getPrediction(userId: string): Promise<PredictionResponse> {
    return this.resolvePrediction(userId);
  }

  async refreshPrediction(userId: string): Promise<PredictionResponse> {
    await this.invalidateCache(userId);
    return this.resolvePrediction(userId, true);
  }

  async invalidateCache(userId: string): Promise<void> {
    await this.prisma.aiPrediction.deleteMany({
      where: { userId },
    });
  }

  private async resolvePrediction(
    userId: string,
    forceRefresh = false,
  ): Promise<PredictionResponse> {
    const referenceDate = new Date();
    const targetMonth = this.getTargetMonthKey(referenceDate);

    if (!forceRefresh) {
      const cachedPrediction = await this.prisma.aiPrediction.findUnique({
        where: { userId },
      });

      if (cachedPrediction && cachedPrediction.month === targetMonth) {
        return this.normalizePrediction(
          cachedPrediction.prediction,
          targetMonth,
        );
      }
    }

    if (!this.openai) {
      throw new ServiceUnavailableException(
        'AI prediction is not configured. Set OPENAI_API_KEY to enable it.',
      );
    }

    const expenseHistory = await fetchExpenseHistory(
      this.prisma,
      userId,
      referenceDate,
    );
    const monthBuckets = bucketByMonth(
      expenseHistory.expenses,
      referenceDate,
      12,
    );
    const trends = detectTrends(monthBuckets);
    const prompt = this.buildPrompt(
      targetMonth,
      monthBuckets,
      expenseHistory.categoryTotals,
      trends,
    );

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: PREDICTION_SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 700,
      });

      const rawContent = completion.choices[0]?.message?.content;

      if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
        throw new InternalServerErrorException(
          'OpenAI returned an empty prediction payload',
        );
      }

      const parsedContent = JSON.parse(rawContent) as unknown;
      const prediction = this.normalizePrediction(
        parsedContent,
        targetMonth,
        monthBuckets,
        trends,
      );

      await this.prisma.aiPrediction.upsert({
        where: { userId },
        create: {
          userId,
          month: targetMonth,
          prediction: prediction as unknown as Prisma.InputJsonValue,
        },
        update: {
          month: targetMonth,
          prediction: prediction as unknown as Prisma.InputJsonValue,
        },
      });

      return prediction;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      this.logger.error(
        `Failed to generate AI prediction: ${this.getErrorMessage(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Unable to generate expense prediction right now.',
      );
    }
  }

  private buildPrompt(
    targetMonth: string,
    monthBuckets: MonthBucket[],
    categoryTotals: ExpenseCategoryTotal[],
    trends: CategoryTrend[],
  ): string {
    const recentAverageTotal = this.averageMonthTotal(monthBuckets.slice(-3));
    const previousAverageTotal = this.averageMonthTotal(
      monthBuckets.slice(-6, -3),
    );

    const promptPayload = {
      targetMonth,
      recentAverageMonthlySpend: recentAverageTotal,
      previousAverageMonthlySpend: previousAverageTotal,
      monthlyHistory: monthBuckets,
      categoryTotals,
      trends,
    };

    return [
      `Forecast the user's expenses for ${targetMonth}.`,
      'Return only a JSON object that matches this schema:',
      JSON.stringify(
        {
          month: 'YYYY-MM',
          predictedTotal: 0,
          summary: 'Short summary of the next-month forecast',
          insights: ['insight 1', 'insight 2'],
          categories: [
            {
              category: 'Category name',
              predictedAmount: 0,
              trend: 'increasing',
              changePercent: 0,
              confidence: 'medium',
              rationale: 'Reason tied to the expense history',
            },
          ],
          generatedAt: 'ISO-8601 timestamp',
        },
        null,
        2,
      ),
      'Rules:',
      '- Use only the supplied expense history and trends.',
      '- Do not invent income, balances, savings, or merchant detail that is not present.',
      '- Keep the summary to one or two sentences.',
      '- Keep insights practical and grounded in the trend data.',
      '- If data is sparse, lower confidence and say so plainly.',
      '- Make category predictions add up roughly to the total prediction.',
      'Expense data:',
      JSON.stringify(promptPayload, null, 2),
    ].join('\n');
  }

  private normalizePrediction(
    rawPrediction: unknown,
    targetMonth: string,
    monthBuckets: MonthBucket[] = [],
    trends: CategoryTrend[] = [],
  ): PredictionResponse {
    const predictionRecord = this.asRecord(rawPrediction);
    const fallbackCategories = trends.map((trend) =>
      this.buildFallbackCategoryPrediction(trend),
    );
    const categoryPredictions = Array.isArray(predictionRecord?.categories)
      ? predictionRecord.categories
          .map((category) => this.normalizeCategoryPrediction(category, trends))
          .filter(
            (category): category is CategoryPrediction => category !== null,
          )
      : [];
    const mergedCategories =
      categoryPredictions.length > 0
        ? this.mergeCategoryPredictions(categoryPredictions, fallbackCategories)
        : fallbackCategories;

    return {
      month: this.readMonth(predictionRecord?.month, targetMonth),
      predictedTotal: this.readCurrency(
        predictionRecord?.predictedTotal,
        this.averageMonthTotal(monthBuckets.slice(-3)),
      ),
      summary:
        this.readString(predictionRecord?.summary) ??
        this.buildFallbackSummary(monthBuckets, trends),
      insights:
        this.readStringArray(predictionRecord?.insights) ??
        this.buildFallbackInsights(monthBuckets, trends),
      categories: mergedCategories.slice(0, 5),
      generatedAt: new Date().toISOString(),
    };
  }

  private normalizeCategoryPrediction(
    rawCategoryPrediction: unknown,
    trends: CategoryTrend[],
  ): CategoryPrediction | null {
    const categoryRecord = this.asRecord(rawCategoryPrediction);
    const category = this.readString(categoryRecord?.category);

    if (!category) {
      return null;
    }

    const matchingTrend = trends.find(
      (trend) => trend.category.toLowerCase() === category.toLowerCase(),
    );

    return {
      category,
      predictedAmount: this.readCurrency(
        categoryRecord?.predictedAmount,
        matchingTrend?.recentAverage ?? 0,
      ),
      trend: this.readTrend(categoryRecord?.trend, matchingTrend?.trend),
      changePercent: this.readPercent(
        categoryRecord?.changePercent,
        matchingTrend?.changePercent ?? 0,
      ),
      confidence: this.readConfidence(
        categoryRecord?.confidence,
        matchingTrend ? 'medium' : 'low',
      ),
      rationale:
        this.readString(categoryRecord?.rationale) ??
        this.buildFallbackRationale(category, matchingTrend),
    };
  }

  private mergeCategoryPredictions(
    aiPredictions: CategoryPrediction[],
    fallbackPredictions: CategoryPrediction[],
  ): CategoryPrediction[] {
    const mergedPredictions = [...aiPredictions];
    const existingCategories = new Set(
      aiPredictions.map((prediction) => prediction.category.toLowerCase()),
    );

    for (const fallbackPrediction of fallbackPredictions) {
      if (!existingCategories.has(fallbackPrediction.category.toLowerCase())) {
        mergedPredictions.push(fallbackPrediction);
      }
    }

    return mergedPredictions.sort(
      (left, right) => right.predictedAmount - left.predictedAmount,
    );
  }

  private buildFallbackCategoryPrediction(
    trend: CategoryTrend,
  ): CategoryPrediction {
    return {
      category: trend.category,
      predictedAmount: this.roundCurrency(trend.recentAverage),
      trend: trend.trend,
      changePercent: this.roundPercentage(trend.changePercent),
      confidence: 'medium',
      rationale: this.buildFallbackRationale(trend.category, trend),
    };
  }

  private buildFallbackSummary(
    monthBuckets: MonthBucket[],
    trends: CategoryTrend[],
  ): string {
    const recentAverageTotal = this.averageMonthTotal(monthBuckets.slice(-3));
    const largestTrend = trends[0];

    if (recentAverageTotal === 0) {
      return 'Not enough expense history is available to produce a reliable forecast yet.';
    }

    if (!largestTrend) {
      return `Recent spending averages about $${recentAverageTotal.toFixed(2)} per month, so the forecast stays close to that baseline.`;
    }

    return `Recent spending averages about $${recentAverageTotal.toFixed(2)} per month, with ${largestTrend.category} showing the strongest ${largestTrend.trend} signal.`;
  }

  private buildFallbackInsights(
    monthBuckets: MonthBucket[],
    trends: CategoryTrend[],
  ): string[] {
    const recentAverageTotal = this.averageMonthTotal(monthBuckets.slice(-3));

    if (recentAverageTotal === 0) {
      return [
        'Add more expense history to improve the reliability of the monthly forecast.',
      ];
    }

    if (trends.length === 0) {
      return [
        'Monthly spending is relatively steady, so the forecast is anchored to the recent average.',
      ];
    }

    return trends.slice(0, 3).map((trend) => {
      const directionLabel =
        trend.trend === 'stable' ? 'holding steady' : `${trend.trend}`;

      return `${trend.category} is ${directionLabel} at about $${trend.recentAverage.toFixed(2)} per month (${trend.changePercent.toFixed(2)}% vs. the prior 3 months).`;
    });
  }

  private buildFallbackRationale(
    category: string,
    trend?: CategoryTrend,
  ): string {
    if (!trend) {
      return `Prediction for ${category} is based on limited historical spending data.`;
    }

    return `${category} has been ${trend.trend} recently, averaging $${trend.recentAverage.toFixed(2)} compared with $${trend.previousAverage.toFixed(2)} in the prior 3 months.`;
  }

  private getTargetMonthKey(referenceDate: Date): string {
    return formatMonthKey(
      new Date(
        Date.UTC(
          referenceDate.getUTCFullYear(),
          referenceDate.getUTCMonth() + 1,
          1,
        ),
      ),
    );
  }

  private averageMonthTotal(monthBuckets: MonthBucket[]): number {
    if (monthBuckets.length === 0) {
      return 0;
    }

    const total = monthBuckets.reduce(
      (sum, bucket) => sum + bucket.totalAmount,
      0,
    );

    return this.roundCurrency(total / monthBuckets.length);
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  private readString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
  }

  private readStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    const items = value
      .map((item) => this.readString(item))
      .filter((item): item is string => item !== null);

    return items.length > 0 ? items.slice(0, 4) : null;
  }

  private readMonth(value: unknown, fallback: string): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
      return fallback;
    }

    return value;
  }

  private readCurrency(value: unknown, fallback: number): number {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue)
      ? this.roundCurrency(parsedValue)
      : this.roundCurrency(fallback);
  }

  private readPercent(value: unknown, fallback: number): number {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue)
      ? this.roundPercentage(parsedValue)
      : this.roundPercentage(fallback);
  }

  private readTrend(
    value: unknown,
    fallback: PredictionTrend = 'stable',
  ): PredictionTrend {
    if (
      value === 'increasing' ||
      value === 'decreasing' ||
      value === 'stable'
    ) {
      return value;
    }

    return fallback;
  }

  private readConfidence(
    value: unknown,
    fallback: PredictionConfidence = 'medium',
  ): PredictionConfidence {
    if (value === 'low' || value === 'medium' || value === 'high') {
      return value;
    }

    return fallback;
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private roundPercentage(value: number): number {
    return Number(value.toFixed(2));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}

const PREDICTION_SYSTEM_PROMPT = `
You are FinTrackr's spending forecast assistant.
Forecast next-month expenses from the user's historical expense data only.
Return valid JSON and keep every claim grounded in the supplied history.
When the data is sparse, reduce confidence and say so plainly instead of guessing.
`.trim();
