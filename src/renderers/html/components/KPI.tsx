interface Props {
  label: string;
  value: string;
  change?: string;
  period?: string;
}

export function KPI({ label, value, change, period }: Props) {
  const isPositive = !!change && /^\s*\+/.test(change);
  const isNegative = !!change && /^\s*-/.test(change);
  const changeColor = isPositive ? '#16a34a' : isNegative ? '#dc2626' : 'var(--text-muted)';
  const changeBg = isPositive ? '#dcfce7' : isNegative ? '#fee2e2' : 'var(--surface2)';

  return (
    <div
      className="md4ai-kpi"
      style={{
        marginBottom: '1rem',
        borderRadius: '1rem',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.08)',
        padding: '1rem 1.1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </div>
        {period && (
          <div
            style={{
              flexShrink: 0,
              borderRadius: '9999px',
              border: '1px solid var(--border)',
              background: 'var(--surface2)',
              padding: '0.15rem 0.5rem',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
            }}
          >
            {period}
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.6rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: '1.9rem',
            lineHeight: 1,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: 'var(--text)',
          }}
        >
          {value}
        </div>
        {change && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              borderRadius: '9999px',
              background: changeBg,
              color: changeColor,
              padding: '0.2rem 0.55rem',
              fontSize: '0.76rem',
              fontWeight: 700,
            }}
          >
            {isPositive ? '↑' : isNegative ? '↓' : null}
            {change}
          </div>
        )}
      </div>
    </div>
  );
}
