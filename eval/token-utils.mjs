/**
 * Token counting and JSON comparison utilities.
 *
 * Strategy:
 *   - Actual model outputs: use the API's exact usage.completion_tokens (always preferred)
 *   - JSON equivalents: use tiktoken for output, and json-prompts.mjs for input estimation.
 *   - Fallback if tiktoken unavailable: chars / 4 estimate
 *
 * Fair Comparison mode: includes estimated JSON system prompt tokens in the baseline.
 */
import { getJsonSystemPromptForCase } from './json-prompts.mjs';

let _enc = null;
let _tiktokenAvailable = false;

async function getEncoder() {
  if (_enc) return _enc;
  try {
    const { getEncoding } = await import('js-tiktoken');
    _enc = getEncoding('cl100k_base');
    _tiktokenAvailable = true;
    return _enc;
  } catch {
    _tiktokenAvailable = false;
    return null;
  }
}

/**
 * Count tokens in a string.
 * Uses tiktoken if available, otherwise chars/4 estimate.
 * @param {string} text
 * @returns {Promise<{ count: number, method: 'tiktoken'|'estimate' }>}
 */
export async function countTokens(text) {
  const enc = await getEncoder();
  if (enc) {
    return { count: enc.encode(text).length, method: 'tiktoken' };
  }
  return { count: Math.ceil(text.length / 4), method: 'estimate' };
}

/** Synchronous fallback for when async context is not available. */
export function estimateTokens(text) {
  if (_enc) return _enc.encode(text).length;
  return Math.ceil(text.length / 4);
}

export function tiktokenAvailable() { return _tiktokenAvailable; }

/**
 * Pre-warm the encoder (call once at startup).
 */
export async function initTokenizer() {
  const enc = await getEncoder();
  if (enc) {
    console.log('  tokenizer: tiktoken cl100k_base (js-tiktoken)');
  } else {
    console.log('  tokenizer: chars/4 estimate (tiktoken unavailable)');
  }
}

/**
 * Extract only the md4ai bridges/directives from a markdown string
 * and count their tokens.
 */
export async function countBridgeOnlyTokens(text) {
  const bridgePatterns = [
    // 1. Inline Bridges: @marker[...]
    /@([a-z][a-z0-9-]*)\[([^\]]*)\]/g,
    // 2. Fence Blocks: ```chart, ```steps, etc.
    /^(\s*)`{3}(chart|steps|timeline|layout|video|card)[\s\S]*?^(\1)`{3}/gm,
    // 3. Callouts: > [!NOTE], etc.
    /^(\s*)>\s*\[!(NOTE|TIP|WARNING|DANGER|INFO)\][\s\S]*?(?=\n\n|\n[^\s>])/gm
  ];

  let bridgeContent = '';
  for (const pattern of bridgePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      bridgeContent += matches.join('\n') + '\n';
    }
  }

  return countTokens(bridgeContent.trim());
}

/**
 * Given an md4ai markdown response and its JSON equivalent,
 * produce a token comparison report including input and output.
 *
 * @param {string} markdownOutput
 * @param {string} jsonEquivalent
 * @param {import('./test-cases.mjs').TEST_CASES[number]} testCase
 * @param {{ promptTokens?: number, completionTokens?: number, totalTokens?: number }} apiUsage
 * @returns {Promise<TokenComparison>}
 */
export async function compareTokens(markdownOutput, jsonEquivalent, testCase, apiUsage = {}) {
  const mdTokens = await countTokens(markdownOutput);
  const jsonTokens = await countTokens(jsonEquivalent);
  
  // THE NEW "PURE BRIDGE" MEASUREMENT
  const mdBridgeTokens = await countBridgeOnlyTokens(markdownOutput);

  const mdChars = markdownOutput.length;
  const jsonChars = jsonEquivalent.length;

  // ── md4ai Side ──────────────────────────────────────────────────────
  const actualCompletionTokens = apiUsage.completionTokens ?? apiUsage.completion_tokens ?? null;
  const mdOutputCount = actualCompletionTokens ?? mdTokens.count;
  const mdInputCount = apiUsage.promptTokens ?? apiUsage.prompt_tokens ?? 0;

  // ── JSON Side ──────────────────────────────────────────────────────
  const jsonOutputCount = jsonTokens.count;
  const userPromptTokens = await countTokens(testCase.userPrompt);
  const jsonSystemPrompt = getJsonSystemPromptForCase(testCase);
  const jsonSystemPromptTokens = await countTokens(jsonSystemPrompt);
  const jsonInputCount = jsonSystemPromptTokens.count + userPromptTokens.count;

  // ── Totals ──────────────────────────────────────────────────────────
  const mdTotal = mdInputCount + mdOutputCount;
  const jsonTotal = jsonInputCount + jsonOutputCount;

  // COMPUTE SAVING BASED ON PURE BRIDGES (Weighted by coverage)
  // coverageRatio is from 0.0 to 1.0 (e.g. 3/4 components = 0.75)
  const coverageRatio = (apiUsage.nodeCounts?.total || 1) / (testCase.expectedComponents.length || 1);
  const weightedJsonOutput = jsonOutputCount * Math.min(1, coverageRatio);
  const outputSaving = weightedJsonOutput - mdBridgeTokens.count;
  const totalSaving = outputSaving;

  return {
    markdown: {
      chars: mdChars,
      input: mdInputCount,
      output: mdOutputCount,
      bridgeOnly: mdBridgeTokens.count,
      total: mdTotal,
      tokenMethod: mdTokens.method,
      actualCompletionTokens,
    },
    json: {
      chars: jsonChars,
      input: jsonInputCount,
      output: jsonOutputCount,
      total: jsonTotal,
      tokenMethod: jsonTokens.method,
    },
    comparison: {
      outputSaving,
      outputSavingPct: parseFloat(((outputSaving / (weightedJsonOutput || 1)) * 100).toFixed(1)),
      totalSaving,
      totalSavingPct: parseFloat(((outputSaving / (weightedJsonOutput || 1)) * 100).toFixed(1)),
      md4aiWins: outputSaving > 0,
    },
    apiUsage: {
      promptTokens: mdInputCount,
      completionTokens: actualCompletionTokens,
      totalTokens: apiUsage.totalTokens ?? (mdInputCount + (actualCompletionTokens ?? 0)),
    },
  };
}

/**
 * Aggregate token comparisons across all test cases for a model.
 * @param {Awaited<ReturnType<typeof compareTokens>>[]} comparisons
 */
export function aggregateComparisons(comparisons) {
  const n = comparisons.length;
  if (n === 0) return null;

  const sum = (fn) => comparisons.reduce((acc, c) => acc + (fn(c) ?? 0), 0);

  const mdInput = sum((c) => c.markdown.input);
  const mdOutput = sum((c) => c.markdown.output);
  const mdBridge = sum((c) => c.markdown.bridgeOnly);
  const jsonInput = sum((c) => c.json.input);
  const jsonOutput = sum((c) => c.json.output);

  const mdTotal = mdInput + mdOutput;
  const jsonTotal = jsonInput + jsonOutput;

  const winsCount = comparisons.filter((c) => c.comparison.md4aiWins).length;
  const globalOutputSavingPct = ((jsonOutput - mdBridge) / (jsonOutput || 1)) * 100;

  return {
    testCaseCount: n,
    md4ai: { input: mdInput, output: mdOutput, bridgeOnly: mdBridge, total: mdTotal },
    json: { input: jsonInput, output: jsonOutput, total: jsonTotal },
    totalTokenSaving: jsonOutput - mdBridge,
    avgTotalSavingPct: parseFloat(globalOutputSavingPct.toFixed(1)),
    avgOutputSavingPct: parseFloat(globalOutputSavingPct.toFixed(1)),
    md4aiWinsCount: winsCount,
    md4aiWinRate: parseFloat(((winsCount / n) * 100).toFixed(1)),
    tokenizerMethod: comparisons[0]?.json.tokenMethod ?? 'estimate',
  };
}
