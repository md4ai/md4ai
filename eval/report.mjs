/**
 * Report generation: turns raw run results into readable logs.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/** Format a number with a sign prefix. */
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);
const pct = (n) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;

/**
 * Write a human-readable report for a single model run.
 *
 * @param {string} outDir - directory to write into
 * @param {object} modelResult - full result object for one model
 */
export function writeModelReport(outDir, modelResult) {
  mkdirSync(outDir, { recursive: true });

  const { model, testCaseResults, aggregate, elapsedMs } = modelResult;

  const lines = [
    `# ${model.id}`,
    `**Family:** ${model.family}  |  **Size:** ${model.sizeB ?? 'unknown'}B  |  **Prompt mode:** ${model.promptMode}`,
    `**Run time:** ${(elapsedMs / 1000).toFixed(1)}s`,
    '',
    '---',
    '',
    '---',
    '',
    '## Aggregate Breakdown',
    '',
    '| Metric | md4ai (Bridges) | JSON (Fair Est.) | Delta |',
    '| --- | --- | --- | --- |',
    `| Syntax tokens | ${aggregate.md4ai.bridgeOnly} | ${aggregate.json.output} | ${signed(aggregate.json.output - aggregate.md4ai.bridgeOnly)} |`,
    `| **Syntax Efficiency** | — | — | **${pct(aggregate.avgOutputSavingPct)}** |`,
    '',
    '| Coverage / Success | Value |',
    '| --- | --- |',
    `| Test cases run | ${aggregate.testCaseCount} |`,
    `| md4ai wins (Syntax) | ${aggregate.md4aiWinsCount}/${aggregate.testCaseCount} (${aggregate.md4aiWinRate}%) |`,
    '',
    '---',
    '',
    '## Test Cases',
    '',
  ];

  for (const tc of testCaseResults) {
    const statusIcon = tc.status === 'ok' ? '✅' : tc.status === 'partial' ? '⚠️' : '❌';
    lines.push(`### ${statusIcon} ${tc.testCase.name}`);
    lines.push('');

    if (tc.status === 'skipped') {
      lines.push(`> Skipped: ${tc.skipReason}`);
      lines.push('');
      continue;
    }

    if (tc.status === 'error') {
      lines.push(`> **API error:** ${tc.error}`);
      lines.push('');
      continue;
    }

    // Components
    const expected = tc.testCase.expectedComponents;
    const found = Object.keys(tc.parseResult?.nodeCounts ?? {});
    const hit = expected.filter((e) => found.includes(e));
    const miss = expected.filter((e) => !found.includes(e));

    lines.push(`**Component coverage:** ${hit.length}/${expected.length}`);
    if (hit.length) lines.push(`- Found: ${hit.map((c) => `\`${c}\``).join(', ')}`);
    if (miss.length) lines.push(`- Missing: ${miss.map((c) => `\`${c}\``).join(', ')}`);
    lines.push('');

    // Token comparison
    const cmp = tc.tokenComparison;
    if (cmp) {
      lines.push('**Pure Bridge Comparison (Syntax Only):**');
      lines.push('');
      lines.push('| Layer | md4ai (Bridges) | JSON (Fair Est.) | Saving |');
      lines.push('| --- | --- | --- | --- |');
      lines.push(`| Tokens | ${cmp.markdown.bridgeOnly} | ${cmp.json.output} | ${signed(cmp.json.output - cmp.markdown.bridgeOnly)} |`);
      lines.push(`| **Efficiency** | — | — | **${pct(cmp.comparison.totalSavingPct)}** |`);
      lines.push('');
      const winner = cmp.comparison.md4aiWins ? '**md4ai** 🏆' : 'JSON';
      lines.push(`**Winner:** ${winner}`);
      lines.push('');
    }

    // Node type breakdown
    const nodeCounts = tc.parseResult?.nodeCounts ?? {};
    if (Object.keys(nodeCounts).length) {
      lines.push('**IR node distribution:**');
      lines.push('');
      lines.push('| Type | Count |');
      lines.push('| --- | --- |');
      for (const [type, count] of Object.entries(nodeCounts).sort((a, b) => b[1] - a[1])) {
        lines.push(`| \`${type}\` | ${count} |`);
      }
      lines.push('');
    }

    // Golden score
    if (tc.goldenScore) {
      const g = tc.goldenScore;
      lines.push(`**Golden example score: ${g.score}/100** (components ${g.componentScore}/60, syntax ${g.syntaxScore}/40)`);
      lines.push('');
      for (const d of g.details) lines.push(`- ${d}`);
      lines.push('');
    }

    // Parse errors
    const errors = tc.parseResult?.errors ?? [];
    if (errors.length) {
      lines.push(`**Parse errors (${errors.length}):**`);
      lines.push('');
      for (const err of errors) {
        lines.push(`- \`[${err.layer}]\` ${err.message}`);
        if (err.context) {
          lines.push('  ```');
          lines.push('  ' + err.context.replace(/\n/g, '\n  ').slice(0, 300));
          lines.push('  ```');
        }
        if (err.recovered) lines.push('  _(recovered with fallback parse)_');
      }
      lines.push('');
    } else {
      lines.push('**Parse errors:** none ✓');
      lines.push('');
    }

    // Model output (truncated)
    if (tc.rawOutput) {
      lines.push('<details><summary>Raw model output</summary>');
      lines.push('');
      lines.push('```markdown');
      lines.push(tc.rawOutput.slice(0, 2000) + (tc.rawOutput.length > 2000 ? '\n... (truncated)' : ''));
      lines.push('```');
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  writeFileSync(join(outDir, 'report.md'), lines.join('\n'), 'utf8');
}

/**
 * Write the errors-only log for quick scanning.
 */
export function writeErrorLog(outDir, modelResult) {
  const errors = [];

  for (const tc of modelResult.testCaseResults) {
    if (tc.status === 'error') {
      errors.push(`[API ERROR] ${tc.testCase.id}: ${tc.error}`);
    }
    for (const err of tc.parseResult?.errors ?? []) {
      errors.push(`[${err.layer.toUpperCase()}] ${tc.testCase.id}: ${err.message}`);
      if (err.context) errors.push(`  context: ${err.context.slice(0, 200).replace(/\n/g, ' ')}`);
    }
  }

  const content = errors.length
    ? errors.join('\n')
    : 'No errors.';

  writeFileSync(join(outDir, 'errors.log'), content, 'utf8');
}

/**
 * Write the full raw JSON for the model run (for programmatic analysis).
 */
export function writeRawJSON(outDir, modelResult) {
  // Strip IR nodes (large) from raw JSON to keep file readable
  const slim = {
    ...modelResult,
    testCaseResults: modelResult.testCaseResults.map((tc) => ({
      ...tc,
      parseResult: tc.parseResult
        ? { ...tc.parseResult, ir: `[${tc.parseResult.irNodeCount} nodes — omitted]` }
        : null,
    })),
  };
  writeFileSync(join(outDir, 'raw.json'), JSON.stringify(slim, null, 2), 'utf8');
}

/**
 * Write the cross-model summary to the run root.
 *
 * @param {string} runDir
 * @param {object[]} allResults
 * @param {string} runId
 */
export function writeSummary(runDir, allResults, runId) {
  const lines = [
    `# md4ai Evaluation Run — ${runId}`,
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Models tested:** ${allResults.length}`,
    '',
    '## Results Summary (Pure Bridge Syntax Efficiency)',
    '',
    '| Model | Size | Cases | Component % | Golden score | Syntax Saving | Errors |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];

  const sorted = [...allResults].sort((a, b) => {
    const coverageA = avgCoverage(a);
    const coverageB = avgCoverage(b);
    return coverageB - coverageA || (b.aggregate?.avgOutputSavingPct ?? 0) - (a.aggregate?.avgOutputSavingPct ?? 0);
  });

  for (const r of sorted) {
    if (!r.aggregate) {
      lines.push(`| ${r.model.id} | ${r.model.sizeB ?? '?'}B | — | — | — | API failed |`);
      continue;
    }
    const coverage = avgCoverage(r).toFixed(0);
    const saving = r.aggregate.avgOutputSavingPct;
    const errorCount = r.testCaseResults.reduce((n, tc) => n + (tc.parseResult?.errors?.length ?? 0), 0);
    const goldenAvg = avgGoldenScore(r);
    const goldenStr = goldenAvg !== null ? `${goldenAvg}/100` : '—';
    lines.push(
      `| \`${r.model.id}\` | ${r.model.sizeB ?? '?'}B | ${r.aggregate.testCaseCount} | ${coverage}% | ${goldenStr} | ${pct(saving)} | ${errorCount} |`
    );
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Efficiency Analysis');
  lines.push('');
  lines.push('**Syntax Saving vs JSON** isolates the core value proposition:');
  lines.push('1. **Bridges Only**: We count only the tokens of md4ai directives (KPIs, Charts, etc.) and ignore prose/formatting.');
  lines.push('2. **Coverage Weighted**: JSON baseline is adjusted by component coverage so models aren\'t "rewarded" for skipping syntax.');

  const ok = sorted.filter((r) => r.aggregate);
  if (ok.length) {
    const bestCoverage = ok.reduce((best, r) => avgCoverage(r) > avgCoverage(best) ? r : best, ok[0]);
    const bestSaving = ok.reduce((best, r) => (r.aggregate.avgOutputSavingPct > best.aggregate.avgOutputSavingPct ? r : best), ok[0]);

    lines.push(`- **Best component coverage:** \`${bestCoverage.model.id}\` (${avgCoverage(bestCoverage).toFixed(0)}%)`);
    lines.push(`- **Most syntax efficient:** \`${bestSaving.model.id}\` (${pct(bestSaving.aggregate.avgOutputSavingPct)})`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Per-model Reports');
  for (const r of sorted) {
    const slug = r.model.id.replace(/\//g, '--');
    lines.push(`- [${r.model.id}](./${slug}/report.md)`);
  }

  writeFileSync(join(runDir, 'summary.md'), lines.join('\n'), 'utf8');

  // Also write a latest-run pointer for the dashboard
  const latestRunInfo = {
    runId,
    timestamp: new Date().toISOString(),
    models: allResults.map(r => r.model.id)
  };
  writeFileSync(join(dirname(runDir), 'latest-run.json'), JSON.stringify(latestRunInfo, null, 2), 'utf8');
}

function avgGoldenScore(modelResult) {
  const scores = (modelResult.testCaseResults ?? [])
    .map((tc) => tc.goldenScore?.score)
    .filter((s) => s !== undefined && s !== null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function avgCoverage(modelResult) {
  const results = modelResult.testCaseResults?.filter((tc) => tc.status !== 'skipped' && tc.status !== 'error') ?? [];
  if (!results.length) return 0;
  const total = results.reduce((acc, tc) => {
    const expected = tc.testCase?.expectedComponents ?? [];
    const found = Object.keys(tc.parseResult?.nodeCounts ?? {});
    const hit = expected.filter((e) => found.includes(e)).length;
    return acc + (expected.length > 0 ? hit / expected.length : 0);
  }, 0);
  return (total / results.length) * 100;
}
