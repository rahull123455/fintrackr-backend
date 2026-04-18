import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

type ExpenseRecord = {
  id: string;
  title: string;
  amount: unknown;
  category: string;
  spentAt: Date;
  note: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createExpenseDto: CreateExpenseDto) {
    const expense = await this.prisma.expense.create({
      data: {
        title: createExpenseDto.title,
        amount: createExpenseDto.amount,
        category: createExpenseDto.category,
        spentAt: new Date(createExpenseDto.spentAt),
        note: createExpenseDto.note,
        userId,
      },
    });

    return this.serializeExpense(expense);
  }

  async findAll(userId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { userId },
      orderBy: { spentAt: 'desc' },
    });

    return expenses.map((expense: ExpenseRecord) =>
      this.serializeExpense(expense),
    );
  }

  async findOne(userId: string, expenseId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    this.assertOwnership(expense, userId);
    return this.serializeExpense(expense);
  }

  async update(
    userId: string,
    expenseId: string,
    updateExpenseDto: UpdateExpenseDto,
  ) {
    const existingExpense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    this.assertOwnership(existingExpense, userId);

    const expense = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        title: updateExpenseDto.title,
        amount: updateExpenseDto.amount,
        category: updateExpenseDto.category,
        spentAt: updateExpenseDto.spentAt
          ? new Date(updateExpenseDto.spentAt)
          : undefined,
        note: updateExpenseDto.note,
      },
    });

    return this.serializeExpense(expense);
  }

  async remove(userId: string, expenseId: string) {
    const existingExpense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    this.assertOwnership(existingExpense, userId);

    await this.prisma.expense.delete({
      where: { id: expenseId },
    });

    return {
      success: true,
      id: expenseId,
    };
  }

  private assertOwnership(
    expense: ExpenseRecord | null,
    userId: string,
  ): asserts expense is ExpenseRecord {
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException('You cannot access this expense');
    }
  }

  private serializeExpense(expense: ExpenseRecord) {
    return {
      id: expense.id,
      title: expense.title,
      amount: Number(expense.amount),
      category: expense.category,
      spentAt: expense.spentAt,
      note: expense.note,
      userId: expense.userId,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }
}
