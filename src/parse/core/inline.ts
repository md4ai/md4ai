import type { InlineNode } from '../../types.js';
import type { BridgeDefinition } from '../../bridge.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

// Find the index just past the closing `]` of a @marker[...] span.
// Respects quoted strings inside brackets. Returns -1 if unclosed.
function findBridgeClose(text: string, openBracket: number): number {
  let i = openBracket + 1;
  let inQuote = false;
  let depth = 1;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === '\\' && inQuote && i + 1 < text.length) { i += 2; continue; }
    if (ch === '"') { inQuote = !inQuote; }
    else if (!inQuote) {
      if (ch === '[') depth++;
      else if (ch === ']') depth--;
    }
    i++;
  }
  return depth === 0 ? i : -1;
}

// Find closing delimiter, does not cross blank lines (\n\n).
function findClose(text: string, from: number, delim: string): number {
  let i = from;
  while (i <= text.length - delim.length) {
    if (text[i] === '\n' && text[i + 1] === '\n') return -1;
    if (text.startsWith(delim, i)) return i;
    i++;
  }
  return -1;
}

// Find matching `]`, counting nested brackets. Returns index of `]` or -1.
function findCloseBracket(text: string, from: number): number {
  let depth = 1;
  let i = from;
  while (i < text.length && depth > 0) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') depth--;
    i++;
  }
  return depth === 0 ? i - 1 : -1;
}

// ─── main scanner ─────────────────────────────────────────────────────────────

export function scanInline(
  text: string,
  bridgeSet: Set<string>,
  allBridges: BridgeDefinition[],
): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;
  let buf = '';

  const flush = () => {
    if (buf) { nodes.push({ type: 'text', value: buf }); buf = ''; }
  };

  while (i < text.length) {
    const ch = text[i];

    // ── Bridge: @marker[data] ───────────────────────────────────────────────
    if (ch === '@') {
      const prev = i > 0 ? text[i - 1] : ' ';
      if (!/[a-zA-Z0-9._]/.test(prev)) {
        const markerMatch = text.slice(i).match(/^@([a-z][a-z0-9-]*)\[/);
        if (markerMatch && bridgeSet.has(markerMatch[1])) {
          const openBracket = i + markerMatch[0].length - 1;
          const end = findBridgeClose(text, openBracket);
          if (end !== -1) {
            flush();
            const rawFull = text.slice(openBracket + 1, end - 1);
            // Detect partial bridge: closePending inserts \x00 before the ] when streaming
            const partial = rawFull.endsWith('\x00');
            const raw = partial ? rawFull.slice(0, -1) : rawFull;
            const marker = markerMatch[1];
            const bridgeDef = allBridges.find((b) => b.marker === marker);
            const data = bridgeDef ? bridgeDef._parse(raw) : raw;
            nodes.push({ type: 'bridge', marker, raw, data, ...(partial && { partial: true }) });
            i = end;
            continue;
          }
        }
      }
    }

    // ── Inline code: `...` or ```...``` ────────────────────────────────────
    if (ch === '`') {
      let ticks = 0;
      while (i + ticks < text.length && text[i + ticks] === '`') ticks++;
      const delim = '`'.repeat(ticks);
      const closeAt = text.indexOf(delim, i + ticks);
      if (closeAt !== -1) {
        flush();
        nodes.push({ type: 'inlineCode', value: text.slice(i + ticks, closeAt).trim() });
        i = closeAt + ticks;
        continue;
      }
    }

    // ── Bold: **...** or __...__ ────────────────────────────────────────────
    if ((ch === '*' && text[i + 1] === '*') || (ch === '_' && text[i + 1] === '_')) {
      const delim = text[i] + text[i];
      const close = findClose(text, i + 2, delim);
      if (close > i + 2) {
        flush();
        const inner = text.slice(i + 2, close);
        nodes.push({ type: 'strong', children: scanInline(inner, bridgeSet, allBridges) });
        i = close + 2;
        continue;
      }
    }

    // ── Emphasis: *...* or _..._ (not ** or __) ─────────────────────────────
    if ((ch === '*' && text[i + 1] !== '*') || (ch === '_' && text[i + 1] !== '_')) {
      const close = findClose(text, i + 1, ch);
      if (close > i + 1 && text[close + 1] !== ch) {
        flush();
        const inner = text.slice(i + 1, close);
        nodes.push({ type: 'emphasis', children: scanInline(inner, bridgeSet, allBridges) });
        i = close + 1;
        continue;
      }
    }

    // ── Image: ![alt](src) ──────────────────────────────────────────────────
    if (ch === '!' && text[i + 1] === '[') {
      const closeBracket = findCloseBracket(text, i + 2);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParens = text.indexOf(')', closeBracket + 2);
        if (closeParens !== -1) {
          flush();
          nodes.push({
            type: 'image',
            src: text.slice(closeBracket + 2, closeParens).trim(),
            alt: text.slice(i + 2, closeBracket).trim(),
          });
          i = closeParens + 1;
          continue;
        }
      }
    }

    // ── Link: [text](url) ───────────────────────────────────────────────────
    if (ch === '[') {
      const closeBracket = findCloseBracket(text, i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParens = text.indexOf(')', closeBracket + 2);
        if (closeParens !== -1) {
          flush();
          nodes.push({
            type: 'link',
            href: text.slice(closeBracket + 2, closeParens).trim(),
            children: scanInline(text.slice(i + 1, closeBracket), bridgeSet, allBridges),
          });
          i = closeParens + 1;
          continue;
        }
      }
    }

    // ── Hard line break ─────────────────────────────────────────────────────
    if (ch === '\n') {
      flush();
      nodes.push({ type: 'break' });
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  flush();
  return nodes;
}
