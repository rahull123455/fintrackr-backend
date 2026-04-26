import { MonthBucket } from './bucket-by-month';

export type CategoryTrendDirection = 'increasing' | 'decreasing' | 'stable';

export type CategoryTrend = {
  category: string;
  trend: CategoryTrendDirection;
  changePercent: number;
  recentAverage: number;
  previousAverage: number;
};

export function detectTrends(monthBuckets: MonthBucket[]): CategoryTrend[] {
  const recentWindow = monthBuckets.slice(-3);
  const previousWindow = monthBuckets.slice(-6, -3);
  const categories = new Set<string>();

  for (const bucket of [...previousWindow, ...recentWindow]) {
    for (const category of bucket.categories) {
      categories.add(category.category);
    }
  }

  return Array.from(categories)
    .map((category) => {
      const recentAverage = averageForCategory(recentWindow, category);
      const previousAverage = averageForCategory(previousWindow, category);
      const changePercent = calculateChangePercent(
        previousAverage,
        recentAverage,
      );

      return {
        category,
        trend: determineTrend(changePercent, previousAverage, recentAverage),
        changePercent,
        recentAverage,
        previousAverage,
      };
    })
    .sort(
      (left, right) =>
        Math.abs(right.changePercent) - Math.abs(left.changePercent),
    );
}

function averageForCategory(window: MonthBucket[], category: string): number {
  if (window.length === 0) {
    return 0;
  }

  const total = window.reduce((sum, bucket) => {
    const categoryBucket = bucket.categories.find(
      (entry) => entry.category === category,
    );

    return sum + (categoryBucket?.totalAmount ?? 0);
  }, 0);

  return roundCurrency(total / window.length);
}

function calculateChangePercent(
  previousAverage: number,
  recentAverage: number,
): number {
  if (previousAverage === 0) {
    return recentAverage === 0 ? 0 : 100;
  }

  return roundPercentage(
    ((recentAverage - previousAverage) / previousAverage) * 100,
  );
}

function determineTrend(
  changePercent: number,
  previousAverage: number,
  recentAverage: number,
): CategoryTrendDirection {
  if (previousAverage === 0 && recentAverage === 0) {
    return 'stable';
  }

  if (Math.abs(changePercent) < 5) {
    return 'stable';
  }

  return changePercent > 0 ? 'increasing' : 'decreasing';
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

function roundPercentage(value: number): number {
  return Number(value.toFixed(2));
}
