import { PrismaService } from '../../prisma/prisma.service';

export type ExpenseHistoryRow = {
  category: string;
  amount: number;
  spentAt: Date;
};

export type ExpenseCategoryTotal = {
  category: string;
  totalAmount: number;
  averageAmount: number;
  expenseCount: number;
};

export type ExpenseHistoryQueryResult = {
  expenses: ExpenseHistoryRow[];
  categoryTotals: ExpenseCategoryTotal[];
  rangeStart: Date;
  rangeEnd: Date;
};

export async function fetchExpenseHistory(
  prisma: PrismaService,
  userId: string,
  referenceDate = new Date(),
): Promise<ExpenseHistoryQueryResult> {
  const rangeStart = getStartOfMonthMonthsAgo(referenceDate, 11);
  const expenseWhere = {
    userId,
    spentAt: {
      gte: rangeStart,
      lte: referenceDate,
    },
  };

  const [expenses, groupedByCategory] = await Promise.all([
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { spentAt: 'asc' },
      select: {
        amount: true,
        category: true,
        spentAt: true,
      },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: expenseWhere,
      _avg: { amount: true },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  return {
    expenses: expenses.map((expense) => ({
      category: expense.category,
      amount: toCurrencyNumber(expense.amount),
      spentAt: expense.spentAt,
    })),
    categoryTotals: groupedByCategory
      .map((group) => ({
        category: group.category,
        totalAmount: toCurrencyNumber(group._sum.amount),
        averageAmount: toCurrencyNumber(group._avg.amount),
        expenseCount: group._count._all,
      }))
      .sort((left, right) => right.totalAmount - left.totalAmount),
    rangeStart,
    rangeEnd: referenceDate,
  };
}

function getStartOfMonthMonthsAgo(
  referenceDate: Date,
  monthsAgo: number,
): Date {
  return new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() - monthsAgo,
      1,
    ),
  );
}

function toCurrencyNumber(value: unknown): number {
  return Number(Number(value ?? 0).toFixed(2));
}
