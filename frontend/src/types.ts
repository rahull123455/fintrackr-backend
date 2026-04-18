export type AuthUser = {
  id: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: string;
  spentAt: string;
  note?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseInput = {
  title: string;
  amount: number;
  category: string;
  spentAt: string;
  note?: string;
};

export type AiCategoryInsight = {
  category: string;
  amount: number;
  shareOfTotal: number;
};

export type AiRecentExpense = {
  title: string;
  amount: number;
  category: string;
  spentAt: string;
};

export type AiExpenseAnalysis = {
  expenseCount: number;
  totalSpend: number;
  averageExpense: number;
  firstExpenseAt: string | null;
  lastExpenseAt: string | null;
  topCategories: AiCategoryInsight[];
  recentExpenses: AiRecentExpense[];
};

export type AiChatResponse = {
  reply: string;
  analysis: AiExpenseAnalysis;
};

export type ContactInquiryInput = {
  name: string;
  surname: string;
  organization: string;
  email: string;
  comments: string;
};

export type ContactInquiry = {
  id: string;
  name: string;
  surname: string;
  organization: string;
  email: string;
  comments: string;
  createdAt: string;
  updatedAt: string;
};
