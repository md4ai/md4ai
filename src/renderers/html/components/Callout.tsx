import type { ReactElement } from 'react';
import type { CalloutVariant } from '../../../types.js';

const ICONS: Record<CalloutVariant, ReactElement> = {
  note: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4m0-4h.01"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4m0-4h.01"/>
    </svg>
  ),
  tip: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a7 7 0 0 1 5 11.95V17a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-3.05A7 7 0 0 1 12 2z"/>
      <path d="M9 21h6m-5-4h4"/>
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/>
      <path d="M12 9v4m0 4h.01"/>
    </svg>
  ),
  danger: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <path d="m15 9-6 6m0-6 6 6"/>
    </svg>
  ),
};

const LABELS: Record<CalloutVariant, string> = {
  note: 'Note',
  info: 'Info',
  tip: 'Tip',
  warning: 'Warning',
  danger: 'Danger',
};

interface Props {
  variant: CalloutVariant;
  renderedChildren: ReactElement[];
}

export function Callout({ variant, renderedChildren }: Props) {
  return (
    <div className={`md4ai-callout md4ai-callout--${variant}`} role="note">
      <span className="md4ai-callout__badge">{ICONS[variant]}</span>
      <div className="md4ai-callout__content">
        <div className="md4ai-callout__label">{LABELS[variant]}</div>
        <div className="md4ai-callout__body">{renderedChildren}</div>
      </div>
    </div>
  );
}
