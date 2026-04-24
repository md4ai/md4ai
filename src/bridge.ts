import type { ReactElement } from 'react';

export type BuiltinPattern = 'scalar' | 'array' | 'keyvalue' | 'range';

export interface BridgeRenderCtx {
  query: (key: string, params?: unknown) => unknown;
  emit: (event: string, data?: unknown) => void;
}

export interface BridgeDefinition<T = unknown> {
  marker: string;
  pattern: BuiltinPattern | ((raw: string) => T);
  render: (data: T, ctx: BridgeRenderCtx) => ReactElement | null;
  prompt: string;
  /** @internal */
  _parse: (raw: string) => T;
}

function applyPattern<T>(pattern: BuiltinPattern | ((raw: string) => T), raw: string): T {
  if (typeof pattern === 'function') return pattern(raw);

  switch (pattern) {
    case 'scalar':
      return raw.trim() as T;

    case 'array':
      return raw.split(',').map((s) => s.trim()).filter(Boolean) as T;

    case 'keyvalue': {
      const result: Record<string, string> = {};
      raw.split(',').forEach((pair) => {
        const colon = pair.indexOf(':');
        if (colon === -1) return;
        result[pair.slice(0, colon).trim()] = pair.slice(colon + 1).trim();
      });
      return result as T;
    }

    case 'range': {
      const match = raw.match(/^(.+?)\s*(?:→|->|to)\s*(.+)$/);
      if (match) return { min: match[1].trim(), max: match[2].trim() } as T;
      return { raw } as T;
    }
  }
}

function autoPrompt(marker: string, pattern: BuiltinPattern | Function): string {
  switch (pattern) {
    case 'scalar':   return `Use @${marker}[value] inline. Example: @${marker}[success]`;
    case 'array':    return `Use @${marker}[a, b, c] inline. Example: @${marker}[React, Vue, Angular]`;
    case 'keyvalue': return `Use @${marker}[key: value, key: value] inline. Example: @${marker}[name: Alice, role: Admin]`;
    case 'range':    return `Use @${marker}[low → high] inline. Example: @${marker}[100 → 500]`;
    default:         return `Use @${marker}[data] to render a ${marker} component.`;
  }
}

export function defineBridge<T = string>(def: {
  marker: string;
  pattern: BuiltinPattern | ((raw: string) => T);
  render: (data: T, ctx: BridgeRenderCtx) => ReactElement | null;
  prompt?: string;
}): BridgeDefinition<T> {
  return {
    ...def,
    prompt: def.prompt ?? autoPrompt(def.marker, def.pattern),
    _parse: (raw: string) => applyPattern(def.pattern, raw),
  };
}
