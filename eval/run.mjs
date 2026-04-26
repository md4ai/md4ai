#!/usr/bin/env node
/**
 * md4ai NVIDIA NIM Evaluation Runner
 *
 * Usage:
 *   node eval/run.mjs                    # all models, all test cases
 *   node eval/run.mjs --quick            # small models only (≤12B)
 *   node eval/run.mjs --model meta/llama-3.3-70b-instruct
 *   node eval/run.mjs --case revenue-dashboard
 *   node eval/run.mjs --optimize-prompts # try all 3 prompt modes per model
 *
 * Results are written to test-results/{runId}/
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { MODELS, QUICK_MODELS } from './models.mjs';
import { TEST_CASES } from './test-cases.mjs';
import { buildSystemPrompt } from './prompts.mjs';
import { debugParse, scoreAgainstGolden } from './parse-debug.mjs';
import { compareTokens, aggregateComparisons, initTokenizer } from './token-utils.mjs';
import { writeModelReport, writeErrorLog, writeRawJSON, writeSummary } from './report.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────

const API_BASE = 'https://integrate.api.nvidia.com/v1';
const API_KEY = process.env.NVIDIA_API_KEY ?? loadEnvKey();

const ARGS = process.argv.slice(2);
const FLAG_QUICK = ARGS.includes('--quick');
const FLAG_OPTIMIZE = ARGS.includes('--optimize-prompts');
const FLAG_MODEL = argValue('--model');
const FLAG_CASE = argValue('--case');
const FLAG_DRY_RUN = ARGS.includes('--dry-run');

/** Retry config for NVIDIA NIM rate limits / low token speed. */
const RETRY = {
  maxAttempts: 4,
  baseDelayMs: 3000,    // start at 3s
  maxDelayMs: 60000,    // cap at 60s
  backoffFactor: 2.5,
};

/** Pause between model runs to avoid hammering the API. */
const INTER_MODEL_DELAY_MS = 1200;
/** Pause between test cases within a model run. */
const INTER_CASE_DELAY_MS = 600;

// ── Entry ─────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('ERROR: NVIDIA_API_KEY not set. Add it to .env or export it.');
    process.exit(1);
  }

  const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const runDir = join(ROOT, 'test-results', runId);
  mkdirSync(runDir, { recursive: true });

  const selectedModels = selectModels();
  const selectedCases = selectCases();

  // Warm up tokenizer before running
  await initTokenizer();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  md4ai × NVIDIA NIM Evaluation`);
  console.log(`  Run: ${runId}`);
  console.log(`  Models: ${selectedModels.length}   Cases: ${TEST_CASES.length}`);
  if (FLAG_DRY_RUN) console.log('  MODE: DRY RUN (no API calls)');
  if (FLAG_OPTIMIZE) console.log('  MODE: PROMPT OPTIMIZATION (3x calls per case)');
  console.log(`${'═'.repeat(60)}\n`);

  // Initialize latest-run.json immediately so the dashboard doesn't 404
  const allResults = [];
  writeSummary(runDir, allResults, runId);

  let modelIdx = 0;

  for (const model of selectedModels) {
    modelIdx++;
    console.log(`\n[${modelIdx}/${selectedModels.length}] ${model.id}`);
    console.log(`  family=${model.family}  size=${model.sizeB ?? '?'}B  promptMode=${model.promptMode}`);

    const modelStartMs = Date.now();
    const modelDir = join(runDir, model.id.replace(/\//g, '--'));
    mkdirSync(modelDir, { recursive: true });

    const testCaseResults = [];
    const promptTokensPerCase = {};

    let modelDead = false;   // set true on permanent errors (404) to skip remaining cases

    for (const tc of selectedCases) {
      process.stdout.write(`  → ${tc.name} ... `);

      if (modelDead) {
        const result = { testCase: tc, status: 'skipped', skipReason: 'model-unavailable', promptTokenCount: 0, rawOutput: null, parseResult: null, tokenComparison: null };
        testCaseResults.push(result);
        console.log(`—  model-unavailable`);
        continue;
      }

      const result = FLAG_OPTIMIZE
        ? await runPromptOptimization(model, tc)
        : await runTestCase(model, tc);

      if (result.status === 'error' && result.error?.includes('404')) {
        modelDead = true;
      }

      testCaseResults.push(result);
      promptTokensPerCase[tc.id] = result.promptTokenCount ?? 0;

      const statusLabel =
        result.status === 'ok' ? '✓'
        : result.status === 'partial' ? '⚠'
        : result.status === 'error' ? '✗'
        : '—';
      const coverageLabel = result.parseResult
        ? `${countHits(result)}/${tc.expectedComponents.length} components`
        : result.error ?? result.skipReason ?? '';
      console.log(`${statusLabel}  ${coverageLabel}`);

      if (selectedCases.indexOf(tc) < selectedCases.length - 1) {
        await sleep(INTER_CASE_DELAY_MS);
      }
    }

    const comparisons = testCaseResults
      .filter((r) => r.tokenComparison)
      .map((r) => r.tokenComparison);

    const aggregate = aggregateComparisons(comparisons) ?? {
      testCaseCount: testCaseResults.length,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalJsonEquivTokens: 0,
      totalTokenSaving: 0,
      avgSavingPct: 0,
      md4aiWinsCount: 0,
      md4aiWinRate: 0,
    };

    const modelResult = {
      model,
      testCaseResults,
      aggregate,
      elapsedMs: Date.now() - modelStartMs,
      promptTokensPerCase,
      runId,
    };

    allResults.push(modelResult);

    // Write per-model output
    writeModelReport(modelDir, modelResult);
    writeErrorLog(modelDir, modelResult);
    writeRawJSON(modelDir, modelResult);

    console.log(`  ✓ done in ${(modelResult.elapsedMs / 1000).toFixed(1)}s`);
    console.log(`    components avg ${avgCoverage(modelResult).toFixed(0)}%  |  total saving ${modelResult.aggregate.avgTotalSavingPct > 0 ? '+' : ''}${modelResult.aggregate.avgTotalSavingPct}%`);

    if (selectedModels.indexOf(model) < selectedModels.length - 1) {
      await sleep(INTER_MODEL_DELAY_MS);
    }

    // Update global summary/latest-run after each model
    writeSummary(runDir, allResults, runId);
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Done. Results: test-results/${runId}/`);
  console.log(`  Summary: test-results/${runId}/summary.md`);
  console.log(`${'═'.repeat(60)}\n`);
}

// ── Test case runner ─────────────────────────────────────────────────────

async function runTestCase(model, testCase) {
  const { systemPrompt, estimatedPromptTokens } = buildSystemPrompt(model, testCase);

  if (FLAG_DRY_RUN) {
    return {
      testCase,
      status: 'skipped',
      skipReason: 'dry-run',
      promptTokenCount: estimatedPromptTokens,
      rawOutput: null,
      parseResult: null,
      tokenComparison: null,
    };
  }

  let rawOutput = null;
  let apiUsage = {};
  let apiError = null;

  try {
    const response = await callNimWithRetry(model.id, systemPrompt, testCase.userPrompt, model.maxTokens);
    rawOutput = response.content;
    apiUsage = response.usage ?? {};
  } catch (err) {
    apiError = err.message;
  }

  if (apiError) {
    return {
      testCase,
      status: 'error',
      error: apiError,
      promptTokenCount: estimatedPromptTokens,
      rawOutput: null,
      parseResult: null,
      tokenComparison: null,
    };
  }

  // Parse with debug wrapper
  const parseResult = debugParse(rawOutput, { streaming: false });

  // Token comparison
  const tokenComparison = await compareTokens(rawOutput, testCase.jsonEquivalent, testCase, {
    promptTokens: apiUsage.prompt_tokens ?? null,
    completionTokens: apiUsage.completion_tokens ?? null,
    totalTokens: apiUsage.total_tokens ?? null,
    nodeCounts: parseResult.nodeCounts,
  });

  // Golden example scoring
  const goldenScore = testCase.goldenExample
    ? scoreAgainstGolden(rawOutput, testCase.goldenExample, testCase.expectedComponents)
    : null;

  // Determine status
  const expectedHits = testCase.expectedComponents.filter(
    (c) => Object.keys(parseResult.nodeCounts).includes(c)
  ).length;
  const coverage = expectedHits / testCase.expectedComponents.length;
  const status = parseResult.errors.length === 0 && coverage >= 0.75
    ? 'ok'
    : parseResult.errors.length > 0 || coverage < 0.4
    ? 'error'
    : 'partial';

  return {
    testCase,
    status,
    promptTokenCount: estimatedPromptTokens,
    rawOutput,
    parseResult,
    tokenComparison,
    goldenScore,
  };
}

/** Try minimal → standard → withExamples and pick the mode with best coverage. */
async function runPromptOptimization(model, testCase) {
  const modes = ['minimal', 'standard', 'withExamples'];
  const results = [];

  for (const mode of modes) {
    const overrideModel = { ...model, promptMode: mode };
    const result = await runTestCase(overrideModel, testCase);
    const hits = countHits(result);
    results.push({ mode, result, hits });
    process.stdout.write(` [${mode}:${hits}/${testCase.expectedComponents.length}]`);
    await sleep(800);
  }

  // Pick best (most hits, fewest errors, smallest prompt)
  results.sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits;
    const ae = a.result.parseResult?.errors?.length ?? 99;
    const be = b.result.parseResult?.errors?.length ?? 99;
    return ae - be;
  });

  const best = results[0];
  best.result.optimizationLog = results.map((r) => ({
    mode: r.mode,
    hits: r.hits,
    errors: r.result.parseResult?.errors?.length ?? 0,
    promptTokens: r.result.promptTokenCount,
  }));

  return best.result;
}

// ── NVIDIA NIM API ────────────────────────────────────────────────────────

/**
 * Call the NVIDIA NIM chat completions endpoint with retry + backoff.
 * Handles 429 (rate limit), 503 (service unavailable), and slow/no response.
 */
async function callNimWithRetry(modelId, systemPrompt, userPrompt, maxTokens = 800) {
  let lastError = null;
  let delayMs = RETRY.baseDelayMs;

  for (let attempt = 1; attempt <= RETRY.maxAttempts; attempt++) {
    try {
      return await callNim(modelId, systemPrompt, userPrompt, maxTokens);
    } catch (err) {
      lastError = err;

      const isRetryable = isRetryableError(err);
      if (!isRetryable || attempt === RETRY.maxAttempts) break;

      const waitMs = Math.min(delayMs, RETRY.maxDelayMs);
      process.stdout.write(` [retry ${attempt}/${RETRY.maxAttempts} in ${(waitMs/1000).toFixed(0)}s]`);
      await sleep(waitMs);
      delayMs = Math.ceil(delayMs * RETRY.backoffFactor);
    }
  }

  throw lastError;
}

async function callNim(modelId, systemPrompt, userPrompt, maxTokens) {
  const controller = new AbortController();
  // Abort after 150s — covers slow NIM models without hanging forever
  const timeout = setTimeout(() => controller.abort(), 150_000);

  let res;
  try {
    res = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,   // low temperature for more consistent syntax
        top_p: 0.9,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    err.retryAfterMs = parseRetryAfter(res);
    throw err;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  if (!content) throw new Error('Empty response from API');

  return { content, usage: data.usage };
}

function isRetryableError(err) {
  // 429 rate limit, 503/502 service issues, aborted (timeout), network errors
  if (err.name === 'AbortError') return true;
  if (err.status === 429 || err.status === 503 || err.status === 502) return true;
  if (!err.status) return true;  // network-level error
  return false;
}

function parseRetryAfter(res) {
  const header = res.headers.get('retry-after');
  if (!header) return null;
  const secs = parseInt(header, 10);
  return isNaN(secs) ? null : secs * 1000;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function selectModels() {
  if (FLAG_MODEL) {
    const m = MODELS.find((m) => m.id === FLAG_MODEL);
    if (!m) { console.error(`Unknown model: ${FLAG_MODEL}`); process.exit(1); }
    return [m];
  }
  return FLAG_QUICK ? QUICK_MODELS : MODELS;
}

function selectCases() {
  if (FLAG_CASE) {
    const tc = TEST_CASES.find((tc) => tc.id === FLAG_CASE);
    if (!tc) { console.error(`Unknown case: ${FLAG_CASE}`); process.exit(1); }
    return [tc];
  }
  return TEST_CASES;
}

function countHits(result) {
  if (!result?.parseResult) return 0;
  const found = Object.keys(result.parseResult.nodeCounts);
  return (result.testCase?.expectedComponents ?? []).filter((c) => found.includes(c)).length;
}

function avgCoverage(modelResult) {
  const results = modelResult.testCaseResults?.filter(
    (tc) => tc.status !== 'skipped' && tc.status !== 'error'
  ) ?? [];
  if (!results.length) return 0;
  const total = results.reduce((acc, tc) => {
    const expected = tc.testCase?.expectedComponents ?? [];
    const found = Object.keys(tc.parseResult?.nodeCounts ?? {});
    const hit = expected.filter((e) => found.includes(e)).length;
    return acc + (expected.length > 0 ? hit / expected.length : 0);
  }, 0);
  return (total / results.length) * 100;
}

function loadEnvKey() {
  try {
    const env = readFileSync(join(ROOT, '.env'), 'utf8');
    const match = env.match(/^NVIDIA_API_KEY=(.+)$/m);
    return match?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

function argValue(flag) {
  const idx = ARGS.indexOf(flag);
  return idx !== -1 && ARGS[idx + 1] ? ARGS[idx + 1] : null;
}

// ── Run ───────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
