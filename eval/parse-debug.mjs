/**
 * Debug wrapper around md4ai parse().
 *
 * Catches and categorises all parse errors, logs them with context,
 * and returns both the best-effort IR and a structured error report.
 */
import { parse, parseStreaming } from '../dist/core.js';

/** Estimate token count using the ~4 chars/token rule. */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Score model output against a golden reference example.
 * Returns a 0–100 score based on:
 *   - Component overlap (60 pts): which md4ai node types appear in both
 *   - Syntax pattern match (40 pts): key marker patterns found in model output
 *
 * @param {string} modelOutput
 * @param {string} goldenExample
 * @param {string[]} expectedComponents
 * @returns {{ score: number, componentScore: number, syntaxScore: number, details: string[] }}
 */
export function scoreAgainstGolden(modelOutput, goldenExample, expectedComponents) {
  const details = [];

  // ── Component overlap score (60 pts) ─────────────────────────────
  const goldenIR = safeParseIR(goldenExample);
  const modelIR = safeParseIR(modelOutput);

  const goldenTypes = new Set(Object.keys(goldenIR));
  const modelTypes = new Set(Object.keys(modelIR));
  const expectedSet = new Set(expectedComponents);

  let componentHits = 0;
  for (const type of expectedSet) {
    if (modelTypes.has(type)) {
      componentHits++;
      details.push(`✓ ${type}`);
    } else {
      details.push(`✗ ${type} (missing)`);
    }
  }
  const componentScore = expectedSet.size > 0
    ? Math.round((componentHits / expectedSet.size) * 60)
    : 60;

  // ── Syntax pattern score (40 pts) ─────────────────────────────────
  const SYNTAX_PATTERNS = [
    { name: '@kpi marker',      re: /@kpi\[/,          pts: 8 },
    { name: '@button marker',   re: /@button\[/,       pts: 6 },
    { name: '@card marker',     re: /@card\[/,         pts: 6 },
    { name: '@input marker',    re: /@input\[/,        pts: 6 },
    { name: 'chart fence',      re: /```chart/,        pts: 8 },
    { name: 'steps/timeline fence', re: /```(steps|timeline)/, pts: 8 },
    { name: 'layout fence',     re: /```layout/,      pts: 8 },
    { name: 'GH callout',       re: />\s*\[!(NOTE|TIP|WARNING|DANGER|INFO)\]/, pts: 8 },
    { name: 'GFM table',        re: /\|.*\|.*\|/,     pts: 6 },
  ];

  // Only check patterns relevant to the golden example
  let syntaxTotal = 0;
  let syntaxEarned = 0;
  for (const p of SYNTAX_PATTERNS) {
    if (p.re.test(goldenExample)) {
      syntaxTotal += p.pts;
      if (p.re.test(modelOutput)) {
        syntaxEarned += p.pts;
        details.push(`✓ syntax: ${p.name}`);
      } else {
        details.push(`✗ syntax: ${p.name}`);
      }
    }
  }
  const syntaxScore = syntaxTotal > 0
    ? Math.round((syntaxEarned / syntaxTotal) * 40)
    : 40;

  const score = componentScore + syntaxScore;

  return { score, componentScore, syntaxScore, details };
}

function safeParseIR(markdown) {
  try {
    const { parse } = _parseRef;
    const ir = parse(markdown);
    const counts = {};
    for (const n of ir) counts[n.type] = (counts[n.type] ?? 0) + 1;
    return counts;
  } catch {
    return {};
  }
}

// Lazy ref to parse — avoids circular import issues
const _parseRef = { parse: null };
import('../dist/core.js').then((m) => { _parseRef.parse = m.parse; });

/**
 * Walk an IR tree and collect node type counts.
 * @param {import('../dist/core.js').IRNode[]} nodes
 * @returns {Record<string, number>}
 */
function countNodeTypes(nodes) {
  const counts = {};
  for (const node of nodes) {
    if (!node?.type) continue;
    counts[node.type] = (counts[node.type] ?? 0) + 1;
    if (node.children && Array.isArray(node.children)) {
      for (const [k, v] of Object.entries(countNodeTypes(node.children))) {
        counts[k] = (counts[k] ?? 0) + v;
      }
    }
    if (node.items && Array.isArray(node.items)) {
      const nested = Array.isArray(node.items[0]) ? node.items.flat() : node.items;
      for (const [k, v] of Object.entries(countNodeTypes(nested))) {
        counts[k] = (counts[k] ?? 0) + v;
      }
    }
  }
  return counts;
}

/**
 * @typedef {Object} ParseResult
 * @property {import('../dist/core.js').IRNode[]} ir        — parsed IR (may be partial on error)
 * @property {ParseError[]} errors                          — all caught errors
 * @property {Record<string, number>} nodeCounts           — node type → count
 * @property {number} estimatedInputTokens
 * @property {number} irNodeCount
 * @property {boolean} ok                                  — true if no errors
 */

/**
 * @typedef {Object} ParseError
 * @property {'lexer'|'plugin'|'ir'|'unknown'} layer
 * @property {string} message
 * @property {string|null} context   — surrounding markdown snippet
 * @property {string|null} stack
 */

/**
 * Run parse() in debug mode: catch all errors, collect node type counts.
 *
 * @param {string} markdown
 * @param {{ bridges?: any[], streaming?: boolean }} opts
 * @returns {ParseResult}
 */
export function debugParse(markdown, { bridges = [], streaming = false } = {}) {
  /** @type {ParseError[]} */
  const errors = [];

  let ir = [];

  // ── Attempt 1: full parse ─────────────────────────────────────────
  try {
    ir = streaming
      ? parseStreaming(markdown, { bridges })
      : parse(markdown, { bridges });
  } catch (err) {
    const layer = classifyError(err);
    errors.push({
      layer,
      message: err?.message ?? String(err),
      context: extractContext(markdown, err),
      stack: err?.stack ?? null,
    });

    // ── Attempt 2: fallback — strip unknown fences and retry ─────────
    try {
      const stripped = stripUnknownFences(markdown);
      ir = parse(stripped, { bridges });
      errors[errors.length - 1].recovered = true;
    } catch (err2) {
      errors.push({
        layer: 'unknown',
        message: 'Fallback parse also failed: ' + (err2?.message ?? String(err2)),
        context: null,
        stack: err2?.stack ?? null,
      });
    }
  }

  // ── Per-node validation pass ──────────────────────────────────────
  const validationErrors = validateIR(ir, markdown);
  errors.push(...validationErrors);

  const nodeCounts = countNodeTypes(ir);

  return {
    ir,
    errors,
    nodeCounts,
    estimatedInputTokens: estimateTokens(markdown),
    irNodeCount: ir.length,
    ok: errors.length === 0,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────

function classifyError(err) {
  const msg = err?.message ?? '';
  if (msg.includes('splitHybrid') || msg.includes('lexer') || msg.includes('token')) return 'lexer';
  if (msg.includes('plugin') || msg.includes('remark') || msg.includes('unified')) return 'plugin';
  if (msg.includes('rootToIR') || msg.includes('inlineToIR')) return 'ir';
  return 'unknown';
}

function extractContext(markdown, err) {
  // Try to find a line number hint in the error
  const lineMatch = err?.message?.match(/line[:\s]+(\d+)/i);
  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1], 10);
    const lines = markdown.split('\n');
    const start = Math.max(0, lineNum - 2);
    const end = Math.min(lines.length, lineNum + 2);
    return lines.slice(start, end).join('\n');
  }
  // Fall back to first 200 chars
  return markdown.slice(0, 200);
}

function stripUnknownFences(markdown) {
  // Remove fenced blocks with unrecognised lang tags
  const knownFences = new Set(['chart', 'video', 'layout', 'steps', 'timeline', 'js', 'ts', 'python', 'bash', 'json', 'yaml', 'sh', 'css', 'html', '']);
  return markdown.replace(/^```(\w*)[^\n]*\n([\s\S]*?)^```/gm, (match, lang) => {
    return knownFences.has(lang.toLowerCase()) ? match : `\`\`\`\n${match.slice(match.indexOf('\n') + 1)}`;
  });
}

/**
 * Light IR validation — catch structurally correct but semantically wrong nodes.
 * @param {import('../dist/core.js').IRNode[]} ir
 * @param {string} markdown
 * @returns {ParseError[]}
 */
function validateIR(ir, markdown) {
  const errors = [];

  for (const node of ir) {
    if (node.type === 'kpi') {
      if (!node.label || !node.value) {
        errors.push({
          layer: 'ir',
          message: `kpi node missing label or value: ${JSON.stringify(node)}`,
          context: null,
          stack: null,
        });
      }
    }

    if (node.type === 'chart') {
      try {
        if (typeof node.data === 'string') JSON.parse(node.data);
      } catch {
        errors.push({
          layer: 'ir',
          message: 'chart node has unparseable data',
          context: String(node.data).slice(0, 120),
          stack: null,
        });
      }
    }

    if (node.type === 'steps' && (!node.items || node.items.length === 0)) {
      errors.push({
        layer: 'ir',
        message: 'steps node has no items',
        context: null,
        stack: null,
      });
    }

    if (node.type === 'layout' && (!node.children || node.children.length === 0)) {
      errors.push({
        layer: 'ir',
        message: 'layout node has no columns',
        context: null,
        stack: null,
      });
    }

    // Check for models that sometimes produce raw @kpi text that wasn't parsed
    if (node.type === 'paragraph') {
      const rawText = node.children?.map((c) => c.value ?? '').join('') ?? '';
      if (/@kpi\[|@button\[|@card\[|@input\[/.test(rawText)) {
        errors.push({
          layer: 'lexer',
          message: `Bridge marker not parsed — treated as plain text: "${rawText.slice(0, 80)}"`,
          context: rawText.slice(0, 200),
          stack: null,
        });
      }
    }
  }

  return errors;
}
