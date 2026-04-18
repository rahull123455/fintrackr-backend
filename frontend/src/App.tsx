import { FormEvent, useEffect, useState } from 'react';
import { api } from './api';
import { FinanceChatbot } from './components/FinanceChatbot';
import { SiteFooter } from './components/SiteFooter';
import type { AuthResponse, AuthUser, Expense, ExpenseInput } from './types';

const tokenStorageKey = 'fintrackr-token';

const categories = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Health',
  'Work',
  'Other',
];

function toLocalDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatMonthLabel(date: Date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    year: '2-digit',
  });
}

function App() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [token, setToken] = useState<string | null>(
    () => window.localStorage.getItem(tokenStorageKey),
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'Food',
    spentAt: toLocalDateTimeValue(),
    note: '',
  });
  const [authError, setAuthError] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setBootstrapping(false);
      setUser(null);
      setExpenses([]);
      return;
    }

    const authToken = token;
    let cancelled = false;

    async function bootstrap() {
      try {
        const [currentUser, currentExpenses] = await Promise.all([
          api.me(authToken),
          api.listExpenses(authToken),
        ]);

        if (!cancelled) {
          setUser(currentUser);
          setExpenses(currentExpenses);
        }
      } catch {
        if (!cancelled) {
          handleLogout();
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token]);

  function persistAuth(auth: AuthResponse) {
    window.localStorage.setItem(tokenStorageKey, auth.accessToken);
    setToken(auth.accessToken);
    setUser(auth.user);
    setAuthPassword('');
    setAuthError('');
    setBootstrapping(true);
  }

  function handleLogout() {
    window.localStorage.removeItem(tokenStorageKey);
    setToken(null);
    setUser(null);
    setExpenses([]);
    setAuthError('');
    setExpenseError('');
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      const action = mode === 'signup' ? api.signup : api.login;
      const auth = await action(authEmail, authPassword);
      persistAuth(auth);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Auth failed');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      return;
    }

    setExpenseLoading(true);
    setExpenseError('');

    try {
      const payload: ExpenseInput = {
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        spentAt: new Date(expenseForm.spentAt).toISOString(),
        note: expenseForm.note.trim() || undefined,
      };

      const created = await api.createExpense(token, payload);
      setExpenses((current) =>
        [created, ...current].sort(
          (a, b) =>
            new Date(b.spentAt).getTime() - new Date(a.spentAt).getTime(),
        ),
      );
      setExpenseForm({
        title: '',
        amount: '',
        category: expenseForm.category,
        spentAt: toLocalDateTimeValue(),
        note: '',
      });
    } catch (error) {
      setExpenseError(
        error instanceof Error ? error.message : 'Could not save expense',
      );
    } finally {
      setExpenseLoading(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!token) {
      return;
    }

    try {
      await api.deleteExpense(token, expenseId);
      setExpenses((current) =>
        current.filter((expense) => expense.id !== expenseId),
      );
    } catch (error) {
      setExpenseError(
        error instanceof Error ? error.message : 'Could not delete expense',
      );
    }
  }

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const averageSpend = expenses.length ? totalSpent / expenses.length : 0;
  const now = new Date();
  const currentMonthSpend = expenses.reduce((sum, expense) => {
    const spentAt = new Date(expense.spentAt);
    const sameMonth =
      spentAt.getMonth() === now.getMonth() &&
      spentAt.getFullYear() === now.getFullYear();
    return sameMonth ? sum + expense.amount : sum;
  }, 0);
  const categorySummary = Object.entries(
    expenses.reduce<Record<string, number>>((accumulator, expense) => {
      accumulator[expense.category] =
        (accumulator[expense.category] ?? 0) + expense.amount;
      return accumulator;
    }, {}),
  )
    .map(([category, amount]) => ({
      category,
      amount,
      share: totalSpent ? (amount / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  const topCategory = categorySummary[0];
  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const amount = expenses.reduce((sum, expense) => {
      const spentAt = new Date(expense.spentAt);
      const sameMonth =
        spentAt.getMonth() === date.getMonth() &&
        spentAt.getFullYear() === date.getFullYear();
      return sameMonth ? sum + expense.amount : sum;
    }, 0);

    return {
      label: formatMonthLabel(date),
      amount,
    };
  });
  const maxMonthlyAmount = Math.max(
    ...monthlyTrend.map((month) => month.amount),
    1,
  );

  return (
    <div className="app-shell">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <main className="layout">
        <section className="hero">
          <p className="eyebrow">FinTrackr Dashboard</p>
          <h1>
            Spend with clarity,
            <span> track with intent.</span>
          </h1>
          <p className="hero-copy">
            A sharp React front end for your NestJS API. Sign in, add expenses,
            and monitor spending in one place.
          </p>

          <div className="metric-strip">
            <article>
              <span>Total logged</span>
              <strong>{expenses.length}</strong>
            </article>
            <article>
              <span>Total spent</span>
              <strong>${totalSpent.toFixed(2)}</strong>
            </article>
            <article>
              <span>API</span>
              <strong>localhost:3000</strong>
            </article>
          </div>
        </section>

        <section className="panel auth-panel">
          <div className="panel-header">
            <p className="panel-kicker">Authentication</p>
            <h2>
              {user
                ? 'Session ready'
                : mode === 'signup'
                  ? 'Create account'
                  : 'Welcome back'}
            </h2>
          </div>

          {user ? (
            <div className="session-card">
              <div>
                <p className="session-label">Signed in as</p>
                <strong>{user.email}</strong>
              </div>
              <button
                className="ghost-button"
                onClick={handleLogout}
                type="button"
              >
                Log out
              </button>
            </div>
          ) : (
            <>
              <div className="mode-switch">
                <button
                  className={mode === 'signup' ? 'active' : ''}
                  onClick={() => setMode('signup')}
                  type="button"
                >
                  Sign up
                </button>
                <button
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => setMode('login')}
                  type="button"
                >
                  Log in
                </button>
              </div>

              <form className="stack" onSubmit={handleAuthSubmit}>
                <label>
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    onChange={(event) => setAuthEmail(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={authEmail}
                  />
                </label>

                <label>
                  <span>Password</span>
                  <input
                    autoComplete={
                      mode === 'signup' ? 'new-password' : 'current-password'
                    }
                    minLength={8}
                    onChange={(event) => setAuthPassword(event.target.value)}
                    placeholder="Minimum 8 characters"
                    type="password"
                    value={authPassword}
                  />
                </label>

                {authError ? <p className="error-text">{authError}</p> : null}

                <button
                  className="primary-button"
                  disabled={authLoading}
                  type="submit"
                >
                  {authLoading
                    ? 'Processing...'
                    : mode === 'signup'
                      ? 'Create account'
                      : 'Log in'}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="panel composer">
          <div className="panel-header">
            <p className="panel-kicker">New Expense</p>
            <h2>Capture a spend event</h2>
          </div>

          <form className="stack" onSubmit={handleExpenseSubmit}>
            <label>
              <span>Title</span>
              <input
                disabled={!user || bootstrapping}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Groceries"
                value={expenseForm.title}
              />
            </label>

            <div className="grid-two">
              <label>
                <span>Amount</span>
                <input
                  disabled={!user || bootstrapping}
                  inputMode="decimal"
                  min="0.01"
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="42.75"
                  step="0.01"
                  value={expenseForm.amount}
                />
              </label>

              <label>
                <span>Category</span>
                <select
                  disabled={!user || bootstrapping}
                  onChange={(event) =>
                    setExpenseForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  value={expenseForm.category}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span>Spent at</span>
              <input
                disabled={!user || bootstrapping}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    spentAt: event.target.value,
                  }))
                }
                type="datetime-local"
                value={expenseForm.spentAt}
              />
            </label>

            <label>
              <span>Note</span>
              <textarea
                disabled={!user || bootstrapping}
                onChange={(event) =>
                  setExpenseForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Weekly shopping, taxi to airport, client lunch..."
                rows={3}
                value={expenseForm.note}
              />
            </label>

            {expenseError ? <p className="error-text">{expenseError}</p> : null}

            <button
              className="primary-button"
              disabled={!user || expenseLoading || bootstrapping}
              type="submit"
            >
              {expenseLoading ? 'Saving...' : 'Add expense'}
            </button>
          </form>
        </section>

        <section className="panel analytics">
          <div className="panel-header">
            <p className="panel-kicker">Analytics</p>
            <h2>Where the money is moving</h2>
          </div>

          {bootstrapping ? (
            <p className="muted-copy">Crunching your numbers...</p>
          ) : !user ? (
            <p className="muted-copy">
              Sign in to unlock category and monthly analytics.
            </p>
          ) : expenses.length === 0 ? (
            <p className="muted-copy">
              Add a few expenses to populate the analytics dashboard.
            </p>
          ) : (
            <div className="analytics-stack">
              <div className="analytics-grid">
                <article className="analytics-card">
                  <span className="analytics-label">This month</span>
                  <strong>${currentMonthSpend.toFixed(2)}</strong>
                </article>
                <article className="analytics-card">
                  <span className="analytics-label">Average expense</span>
                  <strong>${averageSpend.toFixed(2)}</strong>
                </article>
                <article className="analytics-card">
                  <span className="analytics-label">Top category</span>
                  <strong>{topCategory?.category ?? 'None'}</strong>
                </article>
              </div>

              <div className="insight-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <h3>Category split</h3>
                    <span>{categorySummary.length} categories</span>
                  </div>

                  <div className="bar-list">
                    {categorySummary.slice(0, 5).map((item) => (
                      <div className="bar-row" key={item.category}>
                        <div className="bar-copy">
                          <span>{item.category}</span>
                          <strong>${item.amount.toFixed(2)}</strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{ width: `${Math.max(item.share, 8)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <h3>6-month trend</h3>
                    <span>Spending velocity</span>
                  </div>

                  <div className="trend-chart">
                    {monthlyTrend.map((month) => (
                      <div className="trend-column" key={month.label}>
                        <div
                          className="trend-bar"
                          style={{
                            height: `${Math.max(
                              (month.amount / maxMonthlyAmount) * 160,
                              month.amount > 0 ? 18 : 8,
                            )}px`,
                          }}
                        >
                          <span>${month.amount.toFixed(0)}</span>
                        </div>
                        <label>{month.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel ledger">
          <div className="panel-header">
            <p className="panel-kicker">Expense Ledger</p>
            <h2>Recent spending</h2>
          </div>

          {bootstrapping ? (
            <p className="muted-copy">Loading your session...</p>
          ) : !user ? (
            <p className="muted-copy">
              Sign in to view and manage your expenses.
            </p>
          ) : expenses.length === 0 ? (
            <p className="muted-copy">No expenses yet. Add your first record.</p>
          ) : (
            <div className="expense-list">
              {expenses.map((expense) => (
                <article className="expense-card" key={expense.id}>
                  <div className="expense-main">
                    <div>
                      <p className="expense-title">{expense.title}</p>
                      <p className="expense-meta">
                        {expense.category} |{' '}
                        {new Date(expense.spentAt).toLocaleString()}
                      </p>
                      {expense.note ? (
                        <p className="expense-note">{expense.note}</p>
                      ) : null}
                    </div>
                    <div className="expense-side">
                      <strong>${expense.amount.toFixed(2)}</strong>
                      <button
                        className="ghost-button"
                        onClick={() => void handleDeleteExpense(expense.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
      <FinanceChatbot ready={Boolean(user && token) && !bootstrapping} token={token} />
    </div>
  );
}

export default App;
