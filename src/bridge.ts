import type { ReactElement } from 'react';

export type BuiltinPattern = 'scalar' | 'array' | 'keyvalue' | 'range';
export type BridgePattern<T = unknown> = BuiltinPattern | ((raw: string) => T);

export interface BridgeRenderCtx {
  query: (key: string, params?: unknown) => unknown;
  emit: (event: string, data?: unknown) => void;
}

export interface BridgeDefinition<T = unknown> {
  marker: string;
  pattern: BridgePattern<T>;
  render: (data: T, ctx: BridgeRenderCtx) => ReactElement | null;
  prompt: string;
  /** @internal */
  _parse: (raw: string) => T;
}

export const bridgePatterns = {
  scalar: (raw: string) => raw.trim(),
  array: (raw: string) => raw.split(',').map((s) => s.trim()).filter(Boolean),
  keyvalue: (raw: string) => {
    const result: Record<string, string> = {};
    raw.split(',').forEach((pair) => {
      const colon = pair.indexOf(':');
      if (colon === -1) return;
      result[pair.slice(0, colon).trim()] = pair.slice(colon + 1).trim();
    });
    return result;
  },
  range: (raw: string) => {
    const match = raw.match(/^(.+?)\s*(?:→|->|to)\s*(.+)$/);
    if (match) return { min: match[1].trim(), max: match[2].trim() };
    return { raw };
  },
} as const;

export function parseBridgeData<T>(pattern: BridgePattern<T>, raw: string): T {
  if (typeof pattern === 'function') return pattern(raw);

  switch (pattern) {
    case 'scalar':
      return bridgePatterns.scalar(raw) as T;

    case 'array':
      return bridgePatterns.array(raw) as T;

    case 'keyvalue':
      return bridgePatterns.keyvalue(raw) as T;

    case 'range':
      return bridgePatterns.range(raw) as T;
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

function isValidMarker(marker: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(marker);
}

export function defineBridge<T = string>(def: {
  marker: string;
  pattern: BridgePattern<T>;
  render: (data: T, ctx: BridgeRenderCtx) => ReactElement | null;
  prompt?: string;
  onParseError?: (raw: string, error: unknown) => T;
}): BridgeDefinition<T> {
  if (!isValidMarker(def.marker)) {
    throw new Error(`Invalid bridge marker "${def.marker}". Markers must match /^[a-z][a-z0-9-]*$/.`);
  }

  return {
    ...def,
    prompt: def.prompt ?? autoPrompt(def.marker, def.pattern),
    _parse: (raw: string) => {
      try {
        return parseBridgeData(def.pattern, raw);
      } catch (error) {
        if (def.onParseError) return def.onParseError(raw, error);
        return raw as T;
      }
    },
  };
}
