import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SavingsGoal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

@Injectable()
export class SavingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createSavingsGoalDto: CreateSavingsGoalDto) {
    const goal = await this.prisma.savingsGoal.create({
      data: {
        userId,
        name: createSavingsGoalDto.name,
        targetAmount: createSavingsGoalDto.targetAmount,
        savedAmount: createSavingsGoalDto.savedAmount,
        monthlyContribution: createSavingsGoalDto.monthlyContribution,
      },
    });

    return this.serializeGoal(goal);
  }

  async findAll(userId: string) {
    const goals = await this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((goal) => this.serializeGoal(goal));
  }

  async findOne(userId: string, goalId: string) {
    const goal = await this.prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });

    this.assertOwnership(goal, userId);
    return this.serializeGoal(goal);
  }

  async update(
    userId: string,
    goalId: string,
    updateSavingsGoalDto: UpdateSavingsGoalDto,
  ) {
    const existingGoal = await this.prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });

    this.assertOwnership(existingGoal, userId);

    const goal = await this.prisma.savingsGoal.update({
      where: { id: goalId },
      data: {
        name: updateSavingsGoalDto.name,
        targetAmount: updateSavingsGoalDto.targetAmount,
        savedAmount: updateSavingsGoalDto.savedAmount,
        monthlyContribution: updateSavingsGoalDto.monthlyContribution,
      },
    });

    return this.serializeGoal(goal);
  }

  async remove(userId: string, goalId: string) {
    const existingGoal = await this.prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });

    this.assertOwnership(existingGoal, userId);

    await this.prisma.savingsGoal.delete({
      where: { id: goalId },
    });

    return {
      success: true,
      id: goalId,
    };
  }

  private assertOwnership(
    goal: SavingsGoal | null,
    userId: string,
  ): asserts goal is SavingsGoal {
    if (!goal) {
      throw new NotFoundException('Savings goal not found');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenException('You cannot access this savings goal');
    }
  }

  private serializeGoal(goal: SavingsGoal) {
    const targetAmount = this.toCurrencyNumber(goal.targetAmount);
    const savedAmount = this.toCurrencyNumber(goal.savedAmount);
    const monthlyContribution = this.toCurrencyNumber(goal.monthlyContribution);
    const remaining = this.roundCurrency(
      Math.max(targetAmount - savedAmount, 0),
    );
    const isComplete = remaining === 0;
    const progressPercent =
      targetAmount === 0
        ? 0
        : this.roundPercentage(
            Math.min((savedAmount / targetAmount) * 100, 100),
          );
    const monthsToGoal = isComplete
      ? 0
      : monthlyContribution <= 0
        ? null
        : Math.ceil(remaining / monthlyContribution);

    return {
      id: goal.id,
      userId: goal.userId,
      name: goal.name,
      targetAmount,
      savedAmount,
      monthlyContribution,
      remaining,
      progressPercent,
      monthsToGoal,
      isComplete,
      createdAt: goal.createdAt,
      updatedAt: goal.updatedAt,
    };
  }

  private toCurrencyNumber(value: unknown): number {
    return this.roundCurrency(Number(value));
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }

  private roundPercentage(value: number): number {
    return Number(value.toFixed(2));
  }
}
