interface Props {
  label: string;
  href?: string;
  variant?: string;
}

export function Button({ label, href, variant = 'default' }: Props) {
  const cls = `md4ai-button md4ai-button--${variant}`;
  if (href) {
    return <a href={href} className={cls} target="_blank" rel="noreferrer">{label}</a>;
  }
  return <button type="button" className={cls}>{label}</button>;
}
