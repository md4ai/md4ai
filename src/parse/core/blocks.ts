import type { IRNode, InlineNode, CalloutVariant, StepItem, StepsPresentation } from '../../types.js';
import { type ParseState, cur, peek, done, isBlank, skipBlanks, forkState } from './state.js';
import { scanInline } from './inline.js';

// ─── inline helper ────────────────────────────────────────────────────────────

function il(text: string, s: ParseState): InlineNode[] {
  return scanInline(text, s.bridgeSet, s.bridges);
}

// ─── block boundary detection ─────────────────────────────────────────────────

// Returns true when a line opens a new block that should end the current paragraph.
function opensBlock(line: string): boolean {
  if (isBlank(line)) return true;
  if (/^#{1,6}[ \t]/.test(line)) return true;
  if (/^(`{3,}|~{3,})/.test(line)) return true;
  if (/^(---+|\*\*\*+|___+)\s*$/.test(line) && line.trim().length >= 3) return true;
  if (/^[ \t]*>/.test(line)) return true;
  if (/^[ \t]*([-*+])[ \t]/.test(line)) return true;
  if (/^[ \t]*\d+[.)]\s/.test(line)) return true;
  if (line.trimStart().startsWith('|')) return true;
  return false;
}

// ─── step parsing ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, StepItem['status']> = {
  done: 'done', complete: 'done', completed: 'done', shipped: 'done', finished: 'done',
  active: 'active', current: 'active', doing: 'active', 'in progress': 'active', 'in-progress': 'active', wip: 'active',
  planned: 'planned', pending: 'planned', todo: 'planned', upcoming: 'planned', next: 'planned', queued: 'planned',
  blocked: 'blocked', stuck: 'blocked', waiting: 'blocked', paused: 'blocked', held: 'blocked',
};

function toStatus(raw: string): StepItem['status'] | null {
  return STATUS_MAP[raw.toLowerCase().trim()] ?? null;
}

function parseStepLine(raw: string): StepItem | null {
  // Strip list prefixes
  const clean = raw.replace(/^[ \t]*([-*+]|\d+[.)])\s+/, '').trim();
  if (!clean) return null;

  // [status] title  or  title [status]
  const m1 = clean.match(/^\[([^\]]+)\]\s+(.+)$/);
  if (m1) { const st = toStatus(m1[1]); if (st) return { title: m1[2].trim(), status: st }; }
  const m2 = clean.match(/^(.+?)\s+\[([^\]]+)\]$/);
  if (m2) { const st = toStatus(m2[2]); if (st) return { title: m2[1].trim(), status: st }; }

  // status; title (new separator)
  const semi = clean.split(';').map((p) => p.trim());
  if (semi.length >= 2) {
    const s0 = toStatus(semi[0]);
    if (s0) return { title: semi[1], status: s0, ...(semi[2] ? { description: semi[2] } : {}) };
    const s1 = toStatus(semi[1]);
    if (s1) return { title: semi[0], status: s1, ...(semi[2] ? { description: semi[2] } : {}) };
  }

  // status | title (legacy)
  const pipes = clean.split('|').map((p) => p.trim());
  if (pipes.length >= 2) {
    const s0 = toStatus(pipes[0]);
    if (s0) return { title: pipes[1], status: s0, ...(pipes[2] ? { description: pipes[2] } : {}) };
    const s1 = toStatus(pipes[1]);
    if (s1) return { title: pipes[0], status: s1, ...(pipes[2] ? { description: pipes[2] } : {}) };
  }

  return { title: clean, status: 'planned' };
}

function buildSteps(value: string, presentation: StepsPresentation): IRNode {
  const items: StepItem[] = [];
  for (const line of value.split('\n')) {
    if (!line.trim()) continue;
    const item = parseStepLine(line);
    if (item) items.push(item);
  }
  return { type: 'steps', items, presentation };
}

// ─── table row splitter ───────────────────────────────────────────────────────

// Splits "| a | @kpi[b;c] | d |" into cells, skipping | inside @marker[...]
function splitRow(line: string): string[] {
  const src = line.trim().replace(/^\||\|$/g, '');
  const cells: string[] = [];
  let cell = '';
  let inBridge = false;
  let depth = 0;

  for (let i = 0; i < src.length; i++) {
    if (!inBridge && src[i] === '@') {
      const m = src.slice(i).match(/^@[a-z][a-z0-9-]*\[/);
      if (m) { inBridge = true; depth = 1; cell += src[i]; continue; }
    }
    if (inBridge) {
      if (src[i] === '[') depth++;
      else if (src[i] === ']') { depth--; if (depth === 0) inBridge = false; }
      cell += src[i];
    } else if (src[i] === '|') {
      cells.push(cell.trim()); cell = '';
    } else {
      cell += src[i];
    }
  }
  if (cell.trim()) cells.push(cell.trim());
  return cells;
}

function isSeparatorRow(line: string): boolean {
  return /^\|?(\s*:?-{1,}:?\s*\|)+\s*:?-{1,}:?\s*\|?$/.test(line.trim());
}

// ─── list helpers ─────────────────────────────────────────────────────────────

const ULIST_RE = /^([ \t]*)([-*+])[ \t]+(\[[ xX]\][ \t]+)?(.*)$/;
const OLIST_RE = /^([ \t]*)(\d+)[.)][ \t]+(.*)$/;

function lineIndent(line: string): number {
  return (line.match(/^([ \t]*)/)?.[1] ?? '').replace(/\t/g, '  ').length;
}

function isListItem(line: string): boolean {
  return ULIST_RE.test(line) || OLIST_RE.test(line);
}

function extractItem(line: string, ordered: boolean): { content: string; indent: number; checked: boolean | null } {
  if (!ordered) {
    const m = line.match(ULIST_RE)!;
    const checked = m[3] ? /\[x\]/i.test(m[3].trim()) : null;
    return { content: m[4], indent: m[1].replace(/\t/g, '  ').length, checked };
  }
  const m = line.match(OLIST_RE)!;
  return { content: m[3], indent: m[1].replace(/\t/g, '  ').length, checked: null };
}

// ─── block parsers ────────────────────────────────────────────────────────────

export function parseBlocks(s: ParseState): IRNode[] {
  const nodes: IRNode[] = [];
  while (!done(s)) {
    skipBlanks(s);
    if (done(s)) break;
    const node =
      parseFrontmatter(s) ??
      parseFence(s) ??
      parseHeading(s) ??
      parseThematicBreak(s) ??
      parseQuoteBlock(s) ??   // handles both callout and blockquote
      parseList(s) ??
      parseTable(s) ??
      parseParagraph(s);
    if (node) nodes.push(node);
    else s.pos++; // safety — should never trigger
  }
  return nodes;
}

// ── Frontmatter: only valid as the very first block ──────────────────────────

function parseFrontmatter(s: ParseState): IRNode | null {
  if (s.pos !== 0 || cur(s).trim() !== '---') return null;
  // Only treat as frontmatter if a closing --- exists further down
  const closeIdx = s.lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (closeIdx === -1) return null; // no closing --- → fall through to thematicBreak
  s.pos++;
  while (!done(s) && cur(s).trim() !== '---') s.pos++;
  if (!done(s)) s.pos++; // consume closing ---
  return null;
}

// ── Fenced block: ```lang or ~~~lang ─────────────────────────────────────────


function parseFence(s: ParseState): IRNode | null {
  const m = cur(s).match(/^(`{3,}|~{3,})([\w-]*)([ \t].*)?$/);
  if (!m) return null;

  const fence = m[1].slice(0, 3); // ``` or ~~~
  const lang = m[2].toLowerCase();
  const meta = (m[3] ?? '').trim();
  s.pos++;

  const lines: string[] = [];
  while (!done(s) && !cur(s).startsWith(fence)) {
    lines.push(cur(s));
    s.pos++;
  }
  if (!done(s)) s.pos++; // closing fence

  const value = lines.join('\n');

  if (lang === 'chart') {
    try {
      const data = JSON.parse(value);
      return { type: 'chart', chartType: data.type ?? 'bar', data };
    } catch {
      return { type: 'chart', chartType: 'bar', data: null as unknown };
    }
  }

  if (lang === 'video') return { type: 'video', src: value.trim() };

  if (lang === 'layout') {
    const cols = parseInt(meta.match(/columns?=(\d+)/i)?.[1] ?? '2', 10);
    const children = value.split(/^---$/m).map((sec) => parseBlocks(forkState(s, sec.trim().split('\n'))));
    return { type: 'layout', columns: cols, children };
  }

  if (lang === 'steps' || lang === 'timeline') {
    return buildSteps(value, lang as StepsPresentation);
  }

  return { type: 'code', lang: lang || 'text', value };
}

// ── Heading: # through ###### ────────────────────────────────────────────────

function parseHeading(s: ParseState): IRNode | null {
  const m = cur(s).match(/^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/);
  if (!m) return null;
  s.pos++;
  return { type: 'heading', level: m[1].length as 1|2|3|4|5|6, children: il(m[2], s) };
}

// ── Thematic break: --- or *** or ___ ────────────────────────────────────────

function parseThematicBreak(s: ParseState): IRNode | null {
  if (!/^([-*_])\1{2,}\s*$/.test(cur(s).trim())) return null;
  // Don't consume --- that could be a list item (but --- with nothing else is safe)
  s.pos++;
  return { type: 'thematicBreak' };
}

// ── Blockquote + Callout ─────────────────────────────────────────────────────
// Parsed together: collect all > lines, then check if it's a callout.

const CALLOUT_VARIANTS = new Set(['note', 'warning', 'tip', 'danger', 'info']);
const CALLOUT_OPEN = /^\[!(NOTE|WARNING|TIP|DANGER|INFO)\][ \t]*/i;

function parseQuoteBlock(s: ParseState): IRNode | null {
  if (!/^[ \t]*>/.test(cur(s))) return null;

  // Collect all consecutive blockquote lines
  const inner: string[] = [];
  while (!done(s) && /^[ \t]*>/.test(cur(s))) {
    inner.push(cur(s).replace(/^[ \t]*>[ \t]?/, ''));
    s.pos++;
  }

  // Find first non-blank line to check for callout marker
  const firstIdx = inner.findIndex((l) => l.trim() !== '');
  const firstLine = inner[firstIdx] ?? '';
  const calloutMatch = firstLine.trim().match(CALLOUT_OPEN);

  if (calloutMatch && CALLOUT_VARIANTS.has(calloutMatch[1].toLowerCase())) {
    const variant = calloutMatch[1].toLowerCase() as CalloutVariant;
    // Strip the [!TYPE] from the first content line
    const cleaned = [...inner];
    cleaned[firstIdx] = firstLine.replace(CALLOUT_OPEN, '').trimStart();
    // Remove leading blank that might result from stripping
    const contentLines = cleaned[firstIdx].trim() === '' && firstIdx === 0
      ? cleaned.slice(1)
      : cleaned;
    return { type: 'callout', variant, children: parseBlocks(forkState(s, contentLines)) };
  }

  return { type: 'blockquote', children: parseBlocks(forkState(s, inner)) };
}

// ── List: unordered (- * +) and ordered (1. 2.) ──────────────────────────────

function parseList(s: ParseState): IRNode | null {
  if (!isListItem(cur(s))) return null;

  const firstLine = cur(s);
  const ordered = !ULIST_RE.test(firstLine);
  const { indent: baseIndent } = extractItem(firstLine, ordered);

  const items: IRNode[][] = [];
  const checkedItems: (boolean | null)[] = [];

  while (!done(s)) {
    skipBlanks(s);
    if (done(s)) break;

    const line = cur(s);

    // Line at base indent that is a list item of the same type → new item
    if (isListItem(line)) {
      const info = extractItem(line, ordered);
      if (info.indent !== baseIndent) break; // different indent level = stop

      s.pos++;
      checkedItems.push(info.checked);

      // Collect item body: first line content + indented continuation
      const bodyLines: string[] = [info.content];
      while (!done(s) && !isBlank(cur(s))) {
        const next = cur(s);
        const nextIndent = lineIndent(next);
        // Continuation: indented relative to the item bullet
        if (nextIndent > baseIndent) {
          bodyLines.push(next.slice(baseIndent + 2).trimEnd());
          s.pos++;
        } else {
          break;
        }
      }

      items.push(parseBlocks(forkState(s, bodyLines)));
    } else {
      break;
    }
  }

  if (items.length === 0) return null;

  const hasChecks = checkedItems.some((c) => c !== null);
  return {
    type: 'list',
    ordered,
    items,
    ...(hasChecks ? { checkedItems } : {}),
  };
}

// ── Table ────────────────────────────────────────────────────────────────────

function parseTable(s: ParseState): IRNode | null {
  if (!cur(s).trimStart().startsWith('|')) return null;
  if (!isSeparatorRow(peek(s, 1))) return null;

  const head = splitRow(cur(s)).map((c) => il(c, s));
  s.pos += 2; // header + separator

  const rows: InlineNode[][][] = [];
  while (!done(s) && cur(s).trimStart().startsWith('|') && !isBlank(cur(s))) {
    rows.push(splitRow(cur(s)).map((c) => il(c, s)));
    s.pos++;
  }

  return { type: 'table', head, rows };
}

// ── Paragraph: everything else ───────────────────────────────────────────────

function parseParagraph(s: ParseState): IRNode | null {
  if (isBlank(cur(s))) return null;

  const lines: string[] = [];
  while (!done(s) && !isBlank(cur(s)) && !opensBlock(cur(s))) {
    lines.push(cur(s));
    s.pos++;
  }

  if (lines.length === 0) return null;
  return { type: 'paragraph', children: il(lines.join('\n'), s) };
}
