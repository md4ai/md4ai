import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, defineBridge, B } from '../.test-dist/test/entry.js';

const svcBridge = defineBridge({
  marker: 'svc',
  fields: [
    B.string('title').optional(),
    B.records('nodes', [
      B.string('id'),
      B.string('label'),
      B.number('x'),
      B.number('y'),
      B.enum('status', ['active', 'done', 'planned', 'blocked']).default('planned'),
    ]),
    B.list('edges', B.string()).optional(),
  ],
  render: () => null,
});

test('B.records splits pipe-separated items into typed record objects', () => {
  const nodes = parse(
    '@svc[My Service; nodes=api,API Layer,0,80,active|db,Database,220,80,done]',
    { bridges: [svcBridge] }
  );

  const data = nodes[0].children[0].data;
  assert.equal(data.title, 'My Service');
  assert.equal(data.nodes.length, 2);

  assert.deepEqual(data.nodes[0], { id: 'api', label: 'API Layer', x: 0, y: 80, status: 'active' });
  assert.deepEqual(data.nodes[1], { id: 'db',  label: 'Database',  x: 220, y: 80, status: 'done' });
});

test('B.records casts sub-fields to the declared type', () => {
  // Include a `;` to trigger semi-mode so the comma inside the records value
  // is treated as a sub-field separator, not a top-level field separator.
  const nodes = parse(
    '@svc[Type Cast Test; nodes=worker,Worker,100,200,planned]',
    { bridges: [svcBridge] }
  );

  const [record] = nodes[0].children[0].data.nodes;
  assert.strictEqual(typeof record.x, 'number');
  assert.strictEqual(typeof record.y, 'number');
  assert.strictEqual(record.x, 100);
  assert.strictEqual(record.y, 200);
});

test('B.records applies enum default when status value is missing', () => {
  const nodes = parse(
    '@svc[nodes=api,API,0,0]',
    { bridges: [svcBridge] }
  );

  const [record] = nodes[0].children[0].data.nodes;
  assert.equal(record.status, 'planned');
});

test('B.records and B.list coexist in the same bridge', () => {
  const nodes = parse(
    '@svc[nodes=api,API,0,0,active; edges=api>db>query,api>cache>lookup]',
    { bridges: [svcBridge] }
  );

  const data = nodes[0].children[0].data;
  assert.equal(data.nodes.length, 1);
  assert.equal(data.edges.length, 2);
  assert.equal(data.edges[0], 'api>db>query');
});

test('B.records handles a single record without pipe separator', () => {
  const nodes = parse(
    '@svc[Single Node Test; nodes=solo,Solo Node,0,0,active]',
    { bridges: [svcBridge] }
  );

  const data = nodes[0].children[0].data;
  assert.equal(data.nodes.length, 1);
  assert.equal(data.nodes[0].id, 'solo');
  assert.equal(data.nodes[0].label, 'Solo Node');
});
