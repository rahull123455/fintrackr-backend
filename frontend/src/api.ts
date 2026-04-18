import type {
  AiChatResponse,
  ContactInquiry,
  ContactInquiryInput,
  AuthResponse,
  AuthUser,
  Expense,
  ExpenseInput,
} from './types';

function resolveApiUrl(): string {
  const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/$/, '');
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }

  throw new Error(
    'VITE_API_URL is not configured. Set it in your frontend environment variables.',
  );
}

const API_URL = resolveApiUrl();

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const data = await response.json();
      message =
        typeof data.message === 'string'
          ? data.message
          : Array.isArray(data.message)
            ? data.message.join(', ')
            : message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const api = {
  signup(email: string, password: string) {
    return request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  me(token: string) {
    return request<AuthUser>('/auth/me', { method: 'GET' }, token);
  },
  listExpenses(token: string) {
    return request<Expense[]>('/expenses', { method: 'GET' }, token);
  },
  createExpense(token: string, input: ExpenseInput) {
    return request<Expense>(
      '/expenses',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      token,
    );
  },
  deleteExpense(token: string, expenseId: string) {
    return request<{ success: boolean; id: string }>(
      `/expenses/${expenseId}`,
      { method: 'DELETE' },
      token,
    );
  },
  chat(token: string, message: string) {
    return request<AiChatResponse>(
      '/ai/chat',
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      },
      token,
    );
  },
  submitContactInquiry(input: ContactInquiryInput) {
    return request<ContactInquiry>('/contact', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
