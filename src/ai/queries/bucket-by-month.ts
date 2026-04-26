import { ExpenseHistoryRow } from './fetch-expense-history.query';

export type MonthlyCategoryTotal = {
  category: string;
  totalAmount: number;
  expenseCount: number;
};

export type MonthBucket = {
  month: string;
  totalAmount: number;
  expenseCount: number;
  categories: MonthlyCategoryTotal[];
};

export function bucketByMonth(
  expenses: ExpenseHistoryRow[],
  referenceDate = new Date(),
  months = 12,
): MonthBucket[] {
  const buckets = new Map<
    string,
    {
      totalAmount: number;
      expenseCount: number;
      categories: Map<string, MonthlyCategoryTotal>;
    }
  >();

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const monthDate = createUtcMonth(referenceDate, -offset);
    buckets.set(formatMonthKey(monthDate), {
      totalAmount: 0,
      expenseCount: 0,
      categories: new Map<string, MonthlyCategoryTotal>(),
    });
  }

  for (const expense of expenses) {
    const monthKey = formatMonthKey(expense.spentAt);
    const bucket = buckets.get(monthKey);

    if (!bucket) {
      continue;
    }

    bucket.totalAmount = roundCurrency(bucket.totalAmount + expense.amount);
    bucket.expenseCount += 1;

    const categoryTotal = bucket.categories.get(expense.category) ?? {
      category: expense.category,
      totalAmount: 0,
      expenseCount: 0,
    };

    categoryTotal.totalAmount = roundCurrency(
      categoryTotal.totalAmount + expense.amount,
    );
    categoryTotal.expenseCount += 1;
    bucket.categories.set(expense.category, categoryTotal);
  }

  return Array.from(buckets.entries()).map(([month, bucket]) => ({
    month,
    totalAmount: roundCurrency(bucket.totalAmount),
    expenseCount: bucket.expenseCount,
    categories: Array.from(bucket.categories.values()).sort(
      (left, right) => right.totalAmount - left.totalAmount,
    ),
  }));
}

export function formatMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

function createUtcMonth(referenceDate: Date, offset: number): Date {
  return new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() + offset,
      1,
    ),
  );
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}
