import type { ReactElement } from 'react';
import { BridgeField, type InferSchemaType } from './dtypes.js';
import { splitHybrid, splitSemi, cleanToken } from './lexer.js';
 
export type { InferSchemaType };

export type BuiltinPattern = 'scalar' | 'array' | 'keyvalue' | 'range';
export type BridgePattern<T = unknown> = BuiltinPattern | ((raw: string) => T);

/**
 * Field-based bridge definition — describe what data you need, the system
 * handles parsing and prompt generation automatically.
 *
 * Each key is a field name, the value is a plain-English description used
 * to generate the LLM prompt.  Fields are always parsed as keyvalue pairs:
 *   @marker[field: "value", field: "value"]
 */
export type BridgeFields = BridgeField<any>[];

export interface BridgeRenderCtx {
  query: (key: string, params?: unknown) => unknown;
  emit: (event: string, data?: unknown) => void;
}

export interface BridgeDefinition<T = unknown> {
  marker: string;
  pattern: BridgePattern<T>;
  fields?: BridgeFields;
  render: (data: T, ctx: BridgeRenderCtx) => ReactElement | null;
  prompt: string;
  /** Set to false to never show a skeleton placeholder while this bridge is streaming. */
  skeleton?: boolean;
  /** @internal */
  _parse: (raw: string) => T;
}

/**
 * Split `str` on `delim` while respecting "quoted strings" — delimiters
 * inside double-quoted sections are treated as literal characters, not
 * as separators.  Backslash-escaped quotes (\") inside a quoted section
 * are passed through as-is.
 */
export function splitKV(str: string, delim: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\\' && inQuote && i + 1 < str.length) {
      current += ch + str[++i];
    } else if (ch === '"') {
      inQuote = !inQuote;
      current += ch;
    } else if (!inQuote && str.startsWith(delim, i)) {
      parts.push(current);
      current = '';
      i += delim.length - 1;
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** Strip surrounding double-quotes and unescape \" sequences. */
export function unquoteKV(val: string): string {
  const t = val.trim();
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) {
    return t.slice(1, -1).replace(/\\"/g, '"');
  }
  return t;
}

export const bridgePatterns = {
  scalar: (raw: string) => raw.trim(),
  array: (raw: string) => raw.split(',').map((s) => s.trim()).filter(Boolean),
  keyvalue: (raw: string) => {
    const result: Record<string, string> = {};
    splitKV(raw, ',').forEach((pair) => {
      const colon = pair.indexOf(':');
      if (colon === -1) return;
      result[pair.slice(0, colon).trim()] = unquoteKV(pair.slice(colon + 1));
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

export interface GetBridgePromptOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  include?: string[] | ((bridge: BridgeDefinition<any>) => boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exclude?: string[] | ((bridge: BridgeDefinition<any>) => boolean);
  prefix?: string;
  separator?: string;
}

function matchesBridgeSelector(
  selector: GetBridgePromptOptions['include'] | GetBridgePromptOptions['exclude'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bridge: BridgeDefinition<any>,
): boolean {
  if (!selector) return false;
  if (Array.isArray(selector)) return selector.includes(bridge.marker);
  return selector(bridge);
}

export function getBridgePrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bridges: BridgeDefinition<any>[],
  options: GetBridgePromptOptions = {},
): string {
  const separator = options.separator ?? '\n';
  const selected = bridges.filter((bridge) => {
    const included = options.include ? matchesBridgeSelector(options.include, bridge) : true;
    const excluded = options.exclude ? matchesBridgeSelector(options.exclude, bridge) : false;
    return included && !excluded;
  });

  const prompt = selected.map((bridge) => bridge.prompt).join(separator);
  if (!prompt) return options.prefix ?? '';
  return options.prefix ? `${options.prefix}${separator}${prompt}` : prompt;
}
/**
 * Generates the "Tier 1" Bridge Protocol prompt.
 * This teaches the model the universal syntax for all bridges.
 */
export function getBridgeProtocolPrompt(): string {
  return [
    '### Bridge Syntax (@marker)',
    'Use @marker[...] to insert rich UI components inline.',
    '**Separator**: Use semicolons `;` between fields — safe in all markdown contexts (tables, lists, blockquotes).',
    '**Positional**: @marker[value1; value2; value3]',
    '**Named**:     @marker[key=value; key2=value2]',
    '**Mixed**:     @marker[value1; key2=value2]',
    '**Lists**:     Comma-separate items within a field: @marker[tags=a,b,c; next]',
    '**Records**:   For structured lists, pipe-separate records and comma-separate sub-fields within each record:',
    '               @marker[nodes=id,label,x,y|id2,label2,x2,y2; other=val]',
    '**Quotes**:    Only quote values that contain `;` or `=`: @marker["a;b"; next]',
    '**Spacing**:   Ensure a space before `@` when mid-sentence.',
    '**No-Code**:   NEVER emit bridges inside code fences or backticks.',
  ].join('\n');
}

/**
 * Generates a "Compressed Catalog" line for a bridge.
 */
function promptFromFields(marker: string, fields: BridgeFields): string {
  const catalog = fields.map((f) => {
    let part = f.metadata.name;
    if (f.metadata.optional) part += '?';
    if (f.metadata.type === 'enum' && f.metadata.options) {
      part += `: ${f.metadata.options.join('|')}`;
    } else if (f.metadata.type === 'list') {
      part = `|${part}|`;
    } else if (f.metadata.type === 'records') {
      const sub = (f.metadata.recordFields || []).map((rf) => rf.metadata.name).join(',');
      part += `=<${sub}> (| per record)`;
    }
    return part;
  }).join('; ');
 
  const fieldDetails = fields
    .map((f) => {
      const parts = [];
      if (f.metadata.description) parts.push(f.metadata.description);
      if (f.metadata.type === 'number') parts.push('(num)');
      if (f.metadata.type === 'boolean') parts.push('(bool)');
      if (f.metadata.prompt) parts.push(f.metadata.prompt);
      if (parts.length === 0) return null;
      return `  - ${f.metadata.name}: ${parts.join(' ')}`;
    })
    .filter(Boolean)
    .join('\n');
 
  let res = `- @${marker}[${catalog}]`;
  if (fieldDetails) res += `\n${fieldDetails}`;
  return res;
}

function autoPrompt(marker: string, pattern: BuiltinPattern | Function): string {
  switch (pattern) {
    case 'scalar':   return `Use @${marker}[value] inline. Example: @${marker}[success]`;
    case 'array':    return `Use @${marker}[a,b,c] inline. Example: @${marker}[React,Vue,Angular]`;
    case 'keyvalue': return `Use @${marker}[key=value; key2=value2] inline. Example: @${marker}[name=Alice; role=Admin]`;
    case 'range':    return `Use @${marker}[low → high] inline. Example: @${marker}[100 → 500]`;
    default:         return `Use @${marker}[data] to render a ${marker} component.`;
  }
}

function isValidMarker(marker: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(marker);
}

/** Bridge defined with an explicit dType array schema. */
export function defineBridge<F extends BridgeField<any>[]>(def: {
  marker: string;
  fields: F;
  render: (data: InferSchemaType<F>, ctx: BridgeRenderCtx) => ReactElement | null;
  onParseError?: (raw: string, error: unknown) => InferSchemaType<F>;
  /** Set to false to disable the streaming skeleton for this bridge. Default: true */
  skeleton?: boolean;
}): BridgeDefinition<InferSchemaType<F>>;

/** Bridge defined with an explicit pattern — full control over parsing. */
export function defineBridge<T = string>(def: {
  marker: string;
  pattern: BridgePattern<T>;
  render: (data: T, ctx: BridgeRenderCtx) => ReactElement | null;
  prompt?: string;
  onParseError?: (raw: string, error: unknown) => T;
  /** Set to false to disable the streaming skeleton for this bridge. Default: true */
  skeleton?: boolean;
}): BridgeDefinition<T>;

export function defineBridge<T>(def: {
  marker: string;
  fields?: BridgeFields;
  pattern?: BridgePattern<T>;
  render: (data: T, ctx: BridgeRenderCtx) => ReactElement | null;
  prompt?: string;
  onParseError?: (raw: string, error: unknown) => T;
  skeleton?: boolean;
}): BridgeDefinition<T> {
  if (!isValidMarker(def.marker)) {
    throw new Error(`Invalid bridge marker "${def.marker}". Markers must match /^[a-z][a-z0-9-]*$/.`);
  }

  const pattern = def.pattern || ('scalar' as BridgePattern<T>);
  const prompt = def.prompt || (def.fields ? promptFromFields(def.marker, def.fields) : autoPrompt(def.marker, pattern));

  return {
    marker: def.marker,
    pattern,
    fields: def.fields,
    render: def.render,
    prompt,
    ...(def.skeleton === false && { skeleton: false }),
    _parse: (raw: string) => {
      try {
        const fields = def.fields || [];
        if (fields.length === 0) {
          return parseBridgeData(pattern, raw);
        }
        // Detect syntax mode:
        //   semi  → @marker[val1; val2; key=val3]  (new compact syntax)
        //   legacy → @marker["val", key: "val"]    (backward compat)
        const hasSemi = raw.includes(';') && !raw.includes(':');
        const tokens = hasSemi ? splitSemi(raw) : splitHybrid(raw);
        const data: any = {};
        let positionalIdx = 0;

        const parseValue = (field: BridgeField<any>, rawVal: any): any => {
          const meta = field.metadata;
          const val = cleanToken(String(rawVal || ''));

          if (val === undefined || val === '') return meta.defaultValue;

          if (meta.type === 'number') {
            const num = Number(val);
            return Number.isNaN(num) ? val : num;
          }
          if (meta.type === 'boolean') return val.toLowerCase() === 'true';
          if (meta.type === 'enum') return val;
          if (meta.type === 'list') {
            const items = val.split(',').map((s) => s.trim()).filter(Boolean);
            return meta.itemType ? items.map((item) => parseValue(meta.itemType!, item)) : items;
          }
          if (meta.type === 'records') {
            const subFields = meta.recordFields || [];
            return val.split('|').map((s) => s.trim()).filter(Boolean).map((item) => {
              const parts = item.split(',').map((p) => p.trim());
              const record: Record<string, any> = {};
              subFields.forEach((sf, i) => {
                record[sf.metadata.name] = parseValue(sf, parts[i] ?? '');
              });
              return record;
            });
          }
          if (meta.type === 'keyvalue') {
            const kv: Record<string, string> = {};
            val.split(',').forEach((p) => {
              const c = p.indexOf(':');
              if (c !== -1) {
                kv[cleanToken(p.slice(0, c))] = cleanToken(p.slice(c + 1));
              }
            });
            return kv;
          }
          return val;
        };

        tokens.forEach((token) => {
          // New syntax: key=value  |  Legacy syntax: key: value
          const eqIdx = token.indexOf('=');
          const colonIdx = token.indexOf(':');
          const isNamed =
            (hasSemi && eqIdx !== -1 && !token.startsWith('"')) ||
            (!hasSemi && colonIdx !== -1 && !token.startsWith('|') && !token.startsWith('"'));

          if (isNamed) {
            const sep = hasSemi ? eqIdx : colonIdx;
            const key = cleanToken(token.slice(0, sep));
            const val = token.slice(sep + 1);
            data[key] = val;
          } else {
            while (positionalIdx < fields.length) {
              const field = fields[positionalIdx++];
              if (data[field.metadata.name] === undefined) {
                data[field.metadata.name] = token;
                break;
              }
            }
          }
        });

        const final: any = {};
        fields.forEach((field) => {
          final[field.metadata.name] = parseValue(field, data[field.metadata.name]);
        });

        return final as T;
      } catch (e) {
        return raw as T;
      }
    },
  };
}
