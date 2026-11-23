import { DEFAULT_LOCALE, t, type Locale } from '@/lib/i18n';

/** Consent line shown under the first-step submit button (Israeli Privacy Protection Law §11 notice + messaging consent). */
export function LegalNote({ className = '', locale = DEFAULT_LOCALE }: { className?: string; locale?: Locale }) {
  const d = t(locale).legal;
  return (
    <p className={`legal-note ${className}`}>
      <span>{d.consent}</span>
      {' '}<a href="/terms" target="_blank">{d.terms}</a> · <a href="/privacy" target="_blank">{d.privacy}</a>
    </p>
  );
}
