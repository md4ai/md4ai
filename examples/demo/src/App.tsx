import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { parse, parseStreaming, renderContent, themes } from 'md4ai';
import type { ThemeName } from 'md4ai';
import { DEFAULT_CONTENT } from './defaultContent.js';
import { BRIDGES } from './bridges.js';
import hljs from 'highlight.js';

const HIGHLIGHT = (code: string, lang: string) => {
  if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
  return hljs.highlightAuto(code).value;
};

// Theme accent colors for the dot picker
const THEME_DOTS: Record<ThemeName, { light: string; dark: string }> = {
  zinc:   { light: '#18181b', dark: '#e4e4e7' },
  violet: { light: '#7c3aed', dark: '#a78bfa' },
  rose:   { light: '#e11d48', dark: '#fb7185' },
  blue:   { light: '#2563eb', dark: '#60a5fa' },
};

// Convert our ThemeTokens to CSS custom properties for the root element
function tokensToCSSVars(tokens: Record<string, string | undefined>): React.CSSProperties {
  return {
    '--bg':           tokens.bg,
    '--surface':      tokens.surface,
    '--surface2':     tokens.surface2,
    '--border':       tokens.border,
    '--text':         tokens.text,
    '--text-muted':   tokens.textMuted,
    '--accent':       tokens.accent,
    '--accent-hover': tokens.accentHover,
    '--code-bg':      tokens.codeBg,
    '--code-text':    tokens.codeText,
    '--font':         tokens.font,
    '--mono':         tokens.mono,
  } as React.CSSProperties;
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [source, setSource] = useState(DEFAULT_CONTENT);
  const [isDark, setIsDark] = useState(false);
  const [themeName, setThemeName] = useState<ThemeName>('zinc');
  const [dragging, setDragging] = useState(false);
  const [splitPct, setSplitPct] = useState(50);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const streamRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isStreaming = streamingText !== null;

  // Active theme tokens
  const themeTokens = themes[themeName][isDark ? 'dark' : 'light'];
  const cssVars = tokensToCSSVars(themeTokens as Record<string, string | undefined>);

  const stopStream = useCallback(() => {
    if (streamRef.current) clearInterval(streamRef.current);
    streamRef.current = null;
    setStreamingText(null);
  }, []);

  const startStream = useCallback(() => {
    if (streamRef.current) clearInterval(streamRef.current);
    const full = source;
    let pos = 0;
    setStreamingText('');
    streamRef.current = setInterval(() => {
      pos = Math.min(pos + 8, full.length);
      setStreamingText(full.slice(0, pos));
      if (pos >= full.length) {
        clearInterval(streamRef.current!);
        streamRef.current = null;
        setStreamingText(null);
      }
    }, 16);
  }, [source]);

  useEffect(() => () => { if (streamRef.current) clearInterval(streamRef.current); }, []);

  const debouncedSource = useDebounced(source, 150);

  const rendered = useMemo(() => {
    const text = isStreaming ? (streamingText ?? '') : debouncedSource;
    const parser = isStreaming ? parseStreaming : parse;
    try {
      const ir = parser(text, { bridges: BRIDGES });
      return renderContent(ir, { highlight: HIGHLIGHT, theme: themeTokens, bridges: BRIDGES });
    } catch (e) {
      return <pre style={{ color: 'red' }}>{String(e)}</pre>;
    }
  }, [debouncedSource, streamingText, isStreaming, themeTokens]);

  const onMouseDown = useCallback(() => setDragging(true), []);
  const onMouseUp = useCallback(() => setDragging(false), []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setSplitPct(Math.max(20, Math.min(80, pct)));
  }, [dragging]);

  return (
    <div className="app" style={cssVars} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <header className="app-header">
        <div className="app-header__logo">
          <span className="app-header__logo-text">md4ai</span>
          <span className="app-header__tagline">rich markdown for AI</span>
        </div>

        <div className="app-header__actions">
          {/* Theme dot picker */}
          <div className="theme-picker" role="group" aria-label="Choose theme">
            {(Object.keys(themes) as ThemeName[]).map(name => (
              <button
                key={name}
                type="button"
                className={`theme-dot${themeName === name ? ' theme-dot--active' : ''}`}
                style={{ background: THEME_DOTS[name][isDark ? 'dark' : 'light'] }}
                onClick={() => setThemeName(name)}
                title={themes[name].label}
                aria-label={`${themes[name].label} theme`}
                aria-pressed={themeName === name}
              />
            ))}
          </div>

          {/* Stream button */}
          <button
            type="button"
            className={`btn-icon${isStreaming ? ' btn-icon--active' : ''}`}
            onClick={isStreaming ? stopStream : startStream}
            title={isStreaming ? 'Stop stream simulation' : 'Simulate streaming render'}
          >
            {isStreaming ? '⏹ Stop' : '▶ Stream'}
          </button>

          {/* Dark mode */}
          <button
            type="button"
            className="btn-icon"
            onClick={() => setIsDark(d => !d)}
            title="Toggle dark mode"
            aria-label="Toggle dark mode"
          >
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>
      </header>

      <div className="app-body" ref={containerRef}>
        <div className="pane pane--editor" style={{ width: `${splitPct}%` }}>
          <div className="pane__header">
            <span>Markdown</span>
            <span className="pane__badge">source</span>
          </div>
          <textarea
            className="editor"
            value={source}
            onChange={e => setSource(e.target.value)}
            spellCheck={false}
            aria-label="Markdown source editor"
          />
        </div>

        <div
          className={`divider${dragging ? ' divider--active' : ''}`}
          onMouseDown={onMouseDown}
          role="separator"
          aria-label="Resize panels"
        />

        <div className="pane pane--preview" style={{ width: `${100 - splitPct}%` }}>
          <div className="pane__header">
            <span>Preview</span>
            <span className="pane__badge">{isStreaming ? 'streaming' : themes[themeName].label.toLowerCase()}</span>
          </div>
          <div className="preview">
            {rendered}
          </div>
        </div>
      </div>
    </div>
  );
}
