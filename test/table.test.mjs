import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse, renderContent } from '../.test-dist/test/entry.js';

test('renderContent enhances analytics tables with numeric alignment and summary rows', () => {
  const nodes = parse(`| Region | Revenue | Change | Status |
| --- | --- | --- | --- |
| East | $167k | +18% | On track |
| South | $98k | -7% | At risk |
| Total | $265k | +6% | Stable |`);

  const html = renderToStaticMarkup(renderContent(nodes));

  assert.match(html, /md4ai-table-wrapper/);
  assert.match(html, /md4ai-table__cell--numeric/);
  assert.match(html, /md4ai-table__row--summary/);
  assert.match(html, /md4ai-table__pill--positive/);
  assert.match(html, /md4ai-table__pill--negative/);
});
