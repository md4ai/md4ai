import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { defineBridge, parse, parseBridgeData, renderContent } from '../.test-dist/test/entry.js';

test('parse resolves registered bridges using their declared pattern', () => {
  const statusBridge = defineBridge({
    marker: 'status',
    pattern: 'scalar',
    render: () => null,
  });

  const nodes = parse('Build is @status[passing].', { bridges: [statusBridge] });

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'paragraph');
  assert.deepEqual(nodes[0].children, [
    { type: 'text', value: 'Build is ' },
    { type: 'bridge', marker: 'status', raw: 'passing', data: 'passing' },
    { type: 'text', value: '.' },
  ]);
});

test('parse leaves emails, mentions, and unknown markers as plain text', () => {
  const statusBridge = defineBridge({
    marker: 'status',
    pattern: 'scalar',
    render: () => null,
  });

  const nodes = parse(
    'Email ops@example.com, ping @john, keep @unknown[raw], and render @status[pending].',
    { bridges: [statusBridge] },
  );

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'paragraph');
  assert.deepEqual(nodes[0].children, [
    {
      type: 'text',
      value: 'Email ',
    },
    {
      type: 'link',
      href: 'mailto:ops@example.com',
      children: [{ type: 'text', value: 'ops@example.com' }],
    },
    {
      type: 'text',
      value: ', ping @john, keep @unknown[raw], and render ',
    },
    { type: 'bridge', marker: 'status', raw: 'pending', data: 'pending' },
    { type: 'text', value: '.' },
  ]);
});

test('parse applies built-in keyvalue bridge parsing before render time', () => {
  const kpiBridge = defineBridge({
    marker: 'kpi',
    pattern: 'keyvalue',
    render: () => null,
  });

  const nodes = parse('@kpi[value: $167k, label: East Revenue, change: +18%]', {
    bridges: [kpiBridge],
  });

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'paragraph');
  assert.deepEqual(nodes[0].children, [
    {
      type: 'bridge',
      marker: 'kpi',
      raw: 'value: $167k, label: East Revenue, change: +18%',
      data: {
        value: '$167k',
        label: 'East Revenue',
        change: '+18%',
      },
    },
  ]);
});

test('parseBridgeData exposes the built-in bridge parsers for reuse', () => {
  assert.deepEqual(parseBridgeData('array', 'East, North, APAC'), ['East', 'North', 'APAC']);
  assert.deepEqual(parseBridgeData('range', '100 -> 500'), { min: '100', max: '500' });
});

test('defineBridge falls back to raw bridge data when a custom parser throws', () => {
  const flakyBridge = defineBridge({
    marker: 'flaky',
    pattern: () => {
      throw new Error('bad bridge payload');
    },
    render: () => null,
  });

  const nodes = parse('Result: @flaky[still-visible]', { bridges: [flakyBridge] });
  assert.equal(nodes[0].type, 'paragraph');
  assert.deepEqual(nodes[0].children[1], {
    type: 'bridge',
    marker: 'flaky',
    raw: 'still-visible',
    data: 'still-visible',
  });
});

test('defineBridge rejects invalid marker names up front', () => {
  assert.throws(() => defineBridge({
    marker: 'Bad Marker',
    pattern: 'scalar',
    render: () => null,
  }), /Invalid bridge marker/);
});

test('renderContent falls back to visible source when a bridge renderer throws', () => {
  const unstableBridge = defineBridge({
    marker: 'unstable',
    pattern: 'scalar',
    render: () => {
      throw new Error('render crash');
    },
  });

  const nodes = parse('Check @unstable[now].', { bridges: [unstableBridge] });
  const html = renderToStaticMarkup(renderContent(nodes, { bridges: [unstableBridge] }));

  assert.match(html, /@unstable\[now\]/);
});
