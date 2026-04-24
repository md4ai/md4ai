import type { ReactElement } from 'react';

interface Props {
  columns: number;
  renderedChildren: ReactElement[][];
}

export function Layout({ columns, renderedChildren }: Props) {
  return (
    <div
      className="md4ai-layout"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {renderedChildren.map((col, i) => (
        <div key={i} className="md4ai-layout__col">
          {col}
        </div>
      ))}
    </div>
  );
}
