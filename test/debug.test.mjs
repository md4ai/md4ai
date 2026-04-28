import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { B, defineBridge, parse, renderContent } from '../.test-dist/test/entry.js';

test('debug emits bridge parse failure and fallback usage events', () => {
  const events = [];
  const metricBridge = defineBridge({
    marker: 'metric',
    fields: [
      B.number('value'),
    ],
    render: (data) => React.createElement('span', null, String(data.value)),
    fallback: (raw) => React.createElement('span', null, `fallback:${raw}`),
  });

  const nodes = parse('Revenue @metric[not-a-number]', {
    bridges: [metricBridge],
    debug: { onEvent: (event) => events.push(event) },
  });
  const html = renderToStaticMarkup(renderContent(nodes, {
    bridges: [metricBridge],
    debug: { onEvent: (event) => events.push(event) },
  }));

  assert.match(html, /fallback:not-a-number/);
  assert.ok(events.some((event) => event.stage === 'bridge.detected'));
  assert.ok(events.some((event) => event.stage === 'bridge.parse.fail' && event.code === 'E_SCHEMA_NUMBER_INVALID'));
  assert.ok(events.some((event) => event.stage === 'bridge.fallback.used'));
});

test('debug emits store query and emit events', () => {
  const events = [];
  const lookupBridge = defineBridge({
    marker: 'lookup',
    pattern: 'scalar',
    render: (data, ctx) => {
      const value = ctx.query('read', data);
      ctx.emit('viewed', { key: data });
      return React.createElement('span', null, String(value));
    },
  });

  const nodes = parse('@lookup[key]', { bridges: [lookupBridge] });
  renderToStaticMarkup(renderContent(nodes, {
    bridges: [lookupBridge],
    store: {
      read: (key) => (key === 'key' ? 'value' : 'none'),
    },
    onEvent: () => {},
    debug: { onEvent: (event) => events.push(event) },
  }));

  assert.ok(events.some((event) => event.stage === 'store.query.success'));
  assert.ok(events.some((event) => event.stage === 'store.emit.success'));
  assert.ok(events.some((event) => event.stage === 'bridge.render.success'));
});
