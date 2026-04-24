import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStreaming } from '../.test-dist/test/entry.js';

test('parseStreaming keeps incomplete chart fences renderable', () => {
  const nodes = parseStreaming('```chart\n{"type":"bar","labels":["Q1"]');

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'chart');
  assert.equal(nodes[0].chartType, 'bar');
  assert.equal(nodes[0].data, null);
});

test('parseStreaming auto-closes open card directives', () => {
  const nodes = parseStreaming(':::card{title="Next step"}\nShip the docs');

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'card');
  assert.equal(nodes[0].title, 'Next step');
  assert.deepEqual(nodes[0].children, [
    {
      type: 'paragraph',
      children: [{ type: 'text', value: 'Ship the docs' }],
    },
  ]);
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

test('parseStreaming keeps nested card directives renderable even with trailing fallback text', () => {
  const nodes = parseStreaming(`:::card{title="Outer"}
:::card{title="Inner"}
Ship this safely`);

  assert.equal(nodes.length, 2);
  assert.equal(nodes[0].type, 'card');
  assert.equal(nodes[0].title, 'Outer');
  assert.equal(nodes[0].children.length, 1);
  assert.equal(nodes[0].children[0].type, 'card');
  assert.equal(nodes[0].children[0].title, 'Inner');
  assert.equal(nodes[1].type, 'paragraph');
  assert.deepEqual(nodes[1].children, [{ type: 'text', value: ':::' }]);
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
