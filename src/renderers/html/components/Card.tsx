import type { ReactElement } from 'react';

interface Props {
  title?: string;
  renderedChildren: ReactElement[];
}

export function Card({ title, renderedChildren }: Props) {
  return (
    <div className="md4ai-card">
      {title && <div className="md4ai-card__title">{title}</div>}
      <div className="md4ai-card__body">{renderedChildren}</div>
    </div>
  );
}
