import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../.test-dist/test/entry.js';

test('parse turns GitHub-style alerts into callout nodes', () => {
  const nodes = parse(`> [!TIP]
> APAC is growing quickly.`);

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'callout');
  assert.equal(nodes[0].variant, 'tip');
  assert.deepEqual(nodes[0].children, [
    {
      type: 'paragraph',
      children: [{ type: 'text', value: 'APAC is growing quickly.' }],
    },
  ]);
});

test('parse preserves layout columns and sections', () => {
  const nodes = parse(`\`\`\`layout columns=3
### One

Alpha

---

### Two

Beta
    
---

### Three

Gamma
\`\`\``);

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'layout');
  assert.equal(nodes[0].columns, 3);
  assert.equal(nodes[0].children.length, 3);
  assert.equal(nodes[0].children[0][0].type, 'heading');
});

test('parse turns steps fences into structured workflow items', () => {
  const nodes = parse(`\`\`\`steps
- [done] Gather requirements
  Confirm success criteria and edge cases
- Build parser [active]
- Docs: planned
\`\`\``);

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'steps');
  assert.equal(nodes[0].presentation, 'steps');
  assert.deepEqual(nodes[0].items, [
    {
      title: 'Gather requirements',
      status: 'done',
      description: 'Confirm success criteria and edge cases',
    },
    {
      title: 'Build parser',
      status: 'active',
    },
    {
      title: 'Docs',
      status: 'planned',
    },
  ]);
});

test('parse accepts timeline fences and defaults malformed statuses to planned', () => {
  const nodes = parse(`\`\`\`timeline
Discovery | done
Review | ??? | Needs human signoff
Launch
\`\`\``);

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'steps');
  assert.equal(nodes[0].presentation, 'timeline');
  assert.deepEqual(nodes[0].items, [
    { title: 'Discovery', status: 'done' },
    { title: 'Review | ??? | Needs human signoff', status: 'planned' },
    { title: 'Launch', status: 'planned' },
  ]);
});

test('parse turns kpi directives into kpi nodes', () => {
  const nodes = parse('::kpi{label="Revenue" value="$167k" change="+18%" period="QoQ"}');

  assert.equal(nodes.length, 1);
  assert.deepEqual(nodes[0], {
    type: 'kpi',
    label: 'Revenue',
    value: '$167k',
    change: '+18%',
    period: 'QoQ',
  });
});

test('parse keeps task list state for existing GFM behavior', () => {
  const nodes = parse(`- [x] Ship docs
- [ ] Add screenshots
- Plain bullet`);

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'list');
  assert.equal(nodes[0].ordered, false);
  assert.deepEqual(nodes[0].checkedItems, [true, false, null]);
});

test('parse falls back to a pending chart node when chart JSON is invalid', () => {
  const nodes = parse(`\`\`\`chart
{"type":"line","labels":["Q1"]
\`\`\``);

  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, 'chart');
  assert.equal(nodes[0].chartType, 'bar');
  assert.equal(nodes[0].data, null);
});
