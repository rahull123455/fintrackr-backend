import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../api';
import type { AiChatResponse } from '../types';

type FinanceChatbotProps = {
  ready: boolean;
  token: string | null;
};

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  text: string;
  meta?: string;
};

function createInitialMessage(ready: boolean): ChatMessage {
  return ready
    ? {
        id: 'intro-ready',
        role: 'bot',
        text: 'Ask about your spending, strongest categories, or where to cut back next.',
        meta: 'Finance assistant',
      }
    : {
        id: 'intro-locked',
        role: 'bot',
        text: 'Sign in to chat with your finance assistant and get advice based on your expenses.',
        meta: 'Login required',
      };
}

function buildAnalysisMeta(response: AiChatResponse) {
  const topCategory = response.analysis.topCategories[0];

  if (!topCategory) {
    return `${response.analysis.expenseCount} expenses analyzed`;
  }

  return `${response.analysis.expenseCount} expenses analyzed · Top category: ${topCategory.category}`;
}

export function FinanceChatbot({ ready, token }: FinanceChatbotProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createInitialMessage(ready),
  ]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const buttonLabel = useMemo(
    () => (open ? 'Close finance assistant' : 'Open finance assistant'),
    [open],
  );

  useEffect(() => {
    setMessages([createInitialMessage(ready)]);
    setError('');
    setMessage('');
    setSending(false);
  }, [ready]);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
    }
  }, [messages, open]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || !token || !ready || sending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmedMessage,
    };

    setMessages((current) => [...current, userMessage]);
    setMessage('');
    setError('');
    setSending(true);

    try {
      const response = await api.chat(token, trimmedMessage);
      setMessages((current) => [
        ...current,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: response.reply,
          meta: buildAnalysisMeta(response),
        },
      ]);
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : 'Could not reach the finance assistant',
      );
      setMessages((current) => [
        ...current,
        {
          id: `bot-error-${Date.now()}`,
          role: 'bot',
          text: 'I could not generate advice right now. Please try again in a moment.',
          meta: 'Request failed',
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className={`chatbot-shell ${open ? 'open' : ''}`}>
      {open ? (
        <section
          aria-label="Finance assistant chat window"
          className="chatbot-window"
        >
          <div className="chatbot-window-glow chatbot-window-glow-a" />
          <div className="chatbot-window-glow chatbot-window-glow-b" />

          <header className="chatbot-header">
            <div>
              <p className="chatbot-kicker">AI Finance Assistant</p>
              <h3>Ask about your spending</h3>
            </div>
            <button
              aria-label="Close finance assistant"
              className="chatbot-close"
              onClick={() => setOpen(false)}
              type="button"
            >
              x
            </button>
          </header>

          <div className="chatbot-status">
            <span className={`chatbot-status-dot ${ready ? 'live' : ''}`} />
            <span>{ready ? 'Connected to your expense history' : 'Sign in to enable tailored advice'}</span>
          </div>

          <div className="chatbot-messages" ref={scrollerRef}>
            {messages.map((entry) => (
              <article
                className={`chatbot-message chatbot-message-${entry.role}`}
                key={entry.id}
              >
                <div className="chatbot-message-bubble">
                  <p>{entry.text}</p>
                  {entry.meta ? (
                    <span className="chatbot-message-meta">{entry.meta}</span>
                  ) : null}
                </div>
              </article>
            ))}

            {sending ? (
              <article className="chatbot-message chatbot-message-bot">
                <div className="chatbot-message-bubble chatbot-thinking">
                  <span />
                  <span />
                  <span />
                </div>
              </article>
            ) : null}
          </div>

          <form className="chatbot-input-row" onSubmit={(event) => void sendMessage(event)}>
            <input
              className="chatbot-input"
              disabled={!ready || !token || sending}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                ready
                  ? 'How can I reduce food spending this month?'
                  : 'Sign in to unlock AI advice'
              }
              value={message}
            />
            <button
              className="chatbot-send"
              disabled={!ready || !token || sending || !message.trim()}
              type="submit"
            >
              {sending ? '...' : 'Send'}
            </button>
          </form>

          {error ? <p className="chatbot-error">{error}</p> : null}
        </section>
      ) : null}

      <button
        aria-label={buttonLabel}
        className="chatbot-fab"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="chatbot-fab-icon">AI</span>
        <span className="chatbot-fab-copy">
          <strong>Advisor</strong>
          <small>{ready ? 'Live insights' : 'Sign in first'}</small>
        </span>
      </button>
    </div>
  );
}
