import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStreaming, defineBridge, B } from '../.test-dist/test/entry.js';

test('parseStreaming keeps incomplete chart fences renderable', () => {
  const nodes = parseStreaming('```chart\n{"type":"bar","labels":["Q1"]');

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'chart');
  assert.equal(nodes[0].chartType, 'bar');
  assert.equal(nodes[0].data, null);
});

test('parseStreaming emits a partial bridge node when a bridge token is incomplete', () => {
  const kpiBridge = defineBridge({
    marker: 'kpi',
    fields: [
      B.string('label'),
      B.string('value'),
      B.string('change').optional(),
    ],
    render: () => null,
  });

  // Simulate mid-stream: @kpi[ has opened but ] hasn't arrived yet
  const nodes = parseStreaming('Revenue this quarter: @kpi[Q4 Revenue; $2.1M', { bridges: [kpiBridge] });

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'paragraph');
  const bridge = nodes[0].children[1];
  assert.equal(bridge.type, 'bridge');
  assert.equal(bridge.marker, 'kpi');
  assert.equal(bridge.partial, true);
  // Raw must not contain the sentinel byte
  assert.ok(!bridge.raw.includes('\x00'));
});

test('parseStreaming keeps incomplete steps fences renderable', () => {
  const nodes = parseStreaming('```steps\n- [done] Gather requirements\n- Build renderer [active]');

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'steps');
  assert.deepEqual(nodes[0].items, [
    { title: 'Gather requirements', status: 'done' },
    { title: 'Build renderer', status: 'active' },
  ]);
});

test('parseStreaming produces no partial node once the bridge token is closed', () => {
  const kpiBridge = defineBridge({
    marker: 'kpi',
    fields: [B.string('label'), B.string('value')],
    render: () => null,
  });

  const nodes = parseStreaming('@kpi[Revenue; $2.1M]', { bridges: [kpiBridge] });

  assert.equal(nodes.length, 1);
  const bridge = nodes[0].children[0];
  assert.equal(bridge.type, 'bridge');
  assert.equal(bridge.marker, 'kpi');
  assert.ok(!bridge.partial);
  assert.equal(bridge.data.label, 'Revenue');
  assert.equal(bridge.data.value, '$2.1M');
});

test('parseStreaming auto-closes generic code fences without dropping content', () => {
  const nodes = parseStreaming('```ts\nconst status = "streaming";');

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'code');
  assert.equal(nodes[0].lang, 'ts');
  assert.equal(nodes[0].value, 'const status = "streaming";');
});

test('parseStreaming keeps incomplete video fences renderable', () => {
  const nodes = parseStreaming('```video\nhttps://example.com/demo.mp4');

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'video');
  assert.equal(nodes[0].src, 'https://example.com/demo.mp4');
});

test('parseStreaming keeps incomplete layout fences renderable', () => {
  const nodes = parseStreaming(`\`\`\`layout columns=2
### Left

Alpha

---

### Right

Beta`);

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'layout');
  assert.equal(nodes[0].columns, 2);
  assert.equal(nodes[0].children.length, 2);
  assert.equal(nodes[0].children[1][0].type, 'heading');
});
