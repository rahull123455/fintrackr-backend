import { FormEvent, useState } from 'react';
import { api } from '../api';

type InquiryFormState = {
  name: string;
  surname: string;
  organization: string;
  email: string;
  comments: string;
};

const socialLinks = [
  {
    label: 'Twitter',
    href: 'https://twitter.com/VinayakKanojiy2',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/im_vinayak0/',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@apnachannel1660',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/vinayak-k-3840b4251',
  },
];

const legalPanels = [
  {
    id: 'terms-of-use',
    title: 'Terms of Use',
    body: 'Use FinTrackr responsibly and lawfully. Insights and AI responses are informational support, not tax, legal, or investment advice.',
  },
  {
    id: 'privacy-policy',
    title: 'Privacy Policy',
    body: 'Your account, expenses, and inquiries should be handled with care. Contact details submitted through the inquiry form are used only to respond to your request.',
  },
];

const initialFormState: InquiryFormState = {
  name: '',
  surname: '',
  organization: '',
  email: '',
  comments: '',
};

export function SiteFooter() {
  const [form, setForm] = useState<InquiryFormState>(initialFormState);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error' | ''>('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof InquiryFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatusMessage('');
    setStatusTone('');

    try {
      await api.submitContactInquiry(form);
      setForm(initialFormState);
      setStatusTone('success');
      setStatusMessage('Your inquiry was submitted successfully.');
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Could not submit your inquiry.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="site-footer">
      <div className="footer-glow footer-glow-a" />
      <div className="footer-glow footer-glow-b" />

      <div className="footer-grid">
        <section className="footer-panel footer-brand-panel">
          <p className="footer-kicker">FinTrackr</p>
          <h2>Professional finance tooling with a clearer digital front door.</h2>
          <p className="footer-copy">
            Track expenses, review patterns, and open a direct line for
            support, partnerships, or product inquiries without leaving the
            dashboard.
          </p>

          <div className="footer-socials">
            {socialLinks.map((link) => (
              <a
                className="footer-social-link"
                href={link.href}
                key={link.label}
                rel="noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>

        <section className="footer-panel footer-contact-panel">
          <div className="footer-panel-header">
            <p className="footer-kicker">Contact</p>
            <h3>Reach the team directly</h3>
          </div>

          <dl className="footer-contact-list">
            <div>
              <dt>Phone</dt>
              <dd>
                <a href="tel:+919569368180">+91 95693 68180</a>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href="mailto:techvk8180@gmail.com">techvk8180@gmail.com</a>
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>New Delhi - 110001</dd>
            </div>
          </dl>

          <div className="footer-legal-links">
            <a href="#terms-of-use">Terms of Use</a>
            <a href="#privacy-policy">Privacy Policy</a>
          </div>
        </section>

        <section className="footer-panel footer-form-panel">
          <div className="footer-panel-header">
            <p className="footer-kicker">Inquiry Form</p>
            <h3>Start a conversation</h3>
          </div>

          <form className="footer-form" onSubmit={handleSubmit}>
            <div className="footer-form-grid">
              <label>
                <span>Name</span>
                <input
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Vinayak"
                  required
                  value={form.name}
                />
              </label>

              <label>
                <span>Surname</span>
                <input
                  onChange={(event) =>
                    updateField('surname', event.target.value)
                  }
                  placeholder="K"
                  required
                  value={form.surname}
                />
              </label>

              <label>
                <span>Organization</span>
                <input
                  onChange={(event) =>
                    updateField('organization', event.target.value)
                  }
                  placeholder="Your company or team"
                  required
                  value={form.organization}
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={form.email}
                />
              </label>
            </div>

            <label>
              <span>Comments</span>
              <textarea
                onChange={(event) => updateField('comments', event.target.value)}
                placeholder="Tell us what you need help with."
                required
                rows={4}
                value={form.comments}
              />
            </label>

            <button
              className="footer-submit-button"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Sending...' : 'Send inquiry'}
            </button>

            {statusMessage ? (
              <p className={`footer-status-message ${statusTone}`}>
                {statusMessage}
              </p>
            ) : null}
          </form>
        </section>
      </div>

      <div className="footer-legal-panel-grid">
        {legalPanels.map((panel) => (
          <section className="footer-legal-panel" id={panel.id} key={panel.id}>
            <p className="footer-kicker">Policy</p>
            <h3>{panel.title}</h3>
            <p>{panel.body}</p>
          </section>
        ))}
      </div>

      <div className="footer-bottom-bar">
        <p>(c) {new Date().getFullYear()} FinTrackr. Built for structured money decisions.</p>
      </div>
    </footer>
  );
}
