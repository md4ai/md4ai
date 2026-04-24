import type { StepItem, StepStatus, StepsPresentation } from '../../../types.js';

const STEP_STYLES: Record<StepStatus, { color: string; bg: string; border: string; icon: string; label: string }> = {
  done: {
    color: '#15803d',
    bg: 'color-mix(in srgb, #22c55e 12%, var(--surface))',
    border: 'color-mix(in srgb, #22c55e 28%, var(--border))',
    icon: '✓',
    label: 'Done',
  },
  active: {
    color: '#1d4ed8',
    bg: 'color-mix(in srgb, #3b82f6 12%, var(--surface))',
    border: 'color-mix(in srgb, #3b82f6 28%, var(--border))',
    icon: '●',
    label: 'Active',
  },
  planned: {
    color: 'var(--text-muted)',
    bg: 'var(--surface2)',
    border: 'var(--border)',
    icon: '○',
    label: 'Planned',
  },
  blocked: {
    color: '#b91c1c',
    bg: 'color-mix(in srgb, #ef4444 12%, var(--surface))',
    border: 'color-mix(in srgb, #ef4444 28%, var(--border))',
    icon: '!',
    label: 'Blocked',
  },
};

export function Steps({
  items,
  presentation,
}: {
  items: StepItem[];
  presentation: StepsPresentation;
}) {
  if (items.length === 0) {
    return (
      <div
        className="md4ai-steps md4ai-steps--empty"
        style={{
          margin: '1rem 0',
          padding: '1rem 1.1rem',
          borderRadius: '1rem',
          border: '1px dashed var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-muted)',
          fontSize: '0.92rem',
        }}
      >
        Waiting for step details...
      </div>
    );
  }

  return (
    <div
      className={`md4ai-steps md4ai-steps--${presentation}`}
      style={{ display: 'grid', gap: '0.9rem', margin: '1rem 0' }}
    >
      {items.map((item, index) => {
        const style = STEP_STYLES[item.status];
        const isLast = index === items.length - 1;

        return (
          <div
            key={`${item.title}-${index}`}
            className={`md4ai-steps__item md4ai-steps__item--${item.status}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '2.75rem 1fr',
              gap: '0.8rem',
              alignItems: 'start',
            }}
          >
            <div style={{ position: 'relative', display: 'grid', justifyItems: 'center' }}>
              <div
                aria-hidden="true"
                style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '999px',
                  border: `2px solid ${style.border}`,
                  background: style.bg,
                  color: style.color,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  lineHeight: 1,
                  zIndex: 1,
                }}
              >
                {style.icon}
              </div>
              {!isLast && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '2.45rem',
                    bottom: '-0.95rem',
                    width: '2px',
                    background: 'var(--border)',
                    opacity: presentation === 'timeline' ? 1 : 0.75,
                  }}
                />
              )}
            </div>

            <div
              style={{
                minWidth: 0,
                padding: '0.9rem 1rem',
                borderRadius: '1rem',
                border: `1px solid ${style.border}`,
                background: style.bg,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.6rem',
                  marginBottom: item.description ? '0.45rem' : 0,
                }}
              >
                <div
                  style={{
                    flex: '1 1 16rem',
                    minWidth: 0,
                    color: 'var(--text)',
                    fontSize: '0.98rem',
                    fontWeight: 650,
                    lineHeight: 1.35,
                  }}
                >
                  {item.title}
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap',
                    padding: '0.28rem 0.6rem',
                    borderRadius: '999px',
                    border: `1px solid ${style.border}`,
                    background: 'var(--surface)',
                    color: style.color,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span aria-hidden="true">{style.icon}</span>
                  {style.label}
                </span>
              </div>
              {item.description && (
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {item.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
