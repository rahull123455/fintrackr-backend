export type ExpenseCategoryInsight = {
  category: string;
  amount: number;
  shareOfTotal: number;
};

export type RecentExpenseInsight = {
  title: string;
  amount: number;
  category: string;
  spentAt: string;
};

export type ExpenseAnalysisSnapshot = {
  expenseCount: number;
  totalSpend: number;
  averageExpense: number;
  firstExpenseAt: string | null;
  lastExpenseAt: string | null;
  topCategories: ExpenseCategoryInsight[];
  recentExpenses: RecentExpenseInsight[];
};

export type AiChatResponse = {
  reply: string;
  analysis: ExpenseAnalysisSnapshot;
};
