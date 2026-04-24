import type { RenderHTMLOptions } from './types.js';

export type ThemeTokens = NonNullable<RenderHTMLOptions['theme']>;

export interface ThemeDefinition {
  label: string;
  light: ThemeTokens;
  dark: ThemeTokens;
}

// ── Base surfaces shared across themes (zinc palette) ────────────────────────

const zincSurfaces = {
  light: {
    bg: '#ffffff',
    surface: '#ffffff',
    surface2: '#f4f4f5',
    border: '#e4e4e7',
    text: '#09090b',
    textMuted: '#71717a',
    codeBg: '#f4f4f5',
    font: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  dark: {
    bg: '#09090b',
    surface: '#0c0c0f',
    surface2: '#18181b',
    border: '#27272a',
    text: '#fafafa',
    textMuted: '#a1a1aa',
    codeBg: '#18181b',
    font: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
};

// ── Theme presets ─────────────────────────────────────────────────────────────

/**
 * Zinc — shadcn's default neutral theme.
 * Primary action color is near-black/near-white, identical to shadcn's zinc preset.
 */
export const zinc: ThemeDefinition = {
  label: 'Zinc',
  light: {
    ...zincSurfaces.light,
    accent: '#18181b',
    accentHover: '#3f3f46',
    codeText: '#e11d48',
  },
  dark: {
    ...zincSurfaces.dark,
    accent: '#e4e4e7',
    accentHover: '#f4f4f5',
    codeText: '#fb7185',
  },
};

/**
 * Violet — shadcn violet/purple accent.
 * Maps to shadcn's violet color scale.
 */
export const violet: ThemeDefinition = {
  label: 'Violet',
  light: {
    ...zincSurfaces.light,
    accent: '#7c3aed',
    accentHover: '#6d28d9',
    codeText: '#7c3aed',
  },
  dark: {
    ...zincSurfaces.dark,
    accent: '#a78bfa',
    accentHover: '#c4b5fd',
    codeText: '#a78bfa',
  },
};

/**
 * Rose — shadcn rose accent.
 */
export const rose: ThemeDefinition = {
  label: 'Rose',
  light: {
    ...zincSurfaces.light,
    accent: '#e11d48',
    accentHover: '#be123c',
    codeText: '#e11d48',
  },
  dark: {
    ...zincSurfaces.dark,
    accent: '#fb7185',
    accentHover: '#fda4af',
    codeText: '#fb7185',
  },
};

/**
 * Blue — slate surfaces with a blue accent, common in dashboards.
 */
export const blue: ThemeDefinition = {
  label: 'Blue',
  light: {
    ...zincSurfaces.light,
    bg: '#f8fafc',
    surface2: '#f1f5f9',
    border: '#e2e8f0',
    textMuted: '#64748b',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    codeText: '#2563eb',
  },
  dark: {
    ...zincSurfaces.dark,
    bg: '#0f172a',
    surface: '#0f172a',
    surface2: '#1e293b',
    border: '#1e293b',
    textMuted: '#94a3b8',
    accent: '#60a5fa',
    accentHover: '#93c5fd',
    codeText: '#60a5fa',
  },
};

export const themes = { zinc, violet, rose, blue } satisfies Record<string, ThemeDefinition>;
export type ThemeName = keyof typeof themes;
