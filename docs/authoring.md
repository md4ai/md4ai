# Bridge Authoring Guide

Bridges are the heart of `md4ai`. They allow you to map custom inline syntax like `@marker[...]` to rich React components.

---

## The dType Schema API

Instead of plain objects, md4ai uses a fluent **dType** API to define bridge fields. This gives you:
1. **Recursive Parsing**: Lists can contain typed items (e.g., `B.list('scores', B.number())`).
2. **Named or positional**: AI can use positional shorthand or named `key=value` syntax.
3. **Key Sanitization**: Named fields support quoted or spaced keys for robustness.
4. **AI Guidance**: Descriptions and constraints are automatically baked into the system prompt.

### Basic Example

```tsx
import { defineBridge, B } from '@md4ai/core';

export const kpiBridge = defineBridge({
  marker: 'kpi',
  fields: [
    B.string('label').describe('Metric name'),
    B.string('value').describe('Current value'),
    B.enum('trend', ['up', 'down', 'neutral']).default('neutral'),
  ],
  render: ({ label, value, trend }) => (
    <div className={`kpi kpi--${trend}`}>
      <h4>{label}</h4>
      <p>{value}</p>
    </div>
  )
});
```

---

## Bridge Syntax Rules

Every bridge uses `;` as the field separator. This avoids conflicts with markdown tables, blockquotes, and lists.

1. **Positional**: `@kpi[Revenue; $167k; up]`
2. **Named**: `@kpi[label=Revenue; value=$167k; trend=up]`
3. **Mixed**: `@kpi[Revenue; $167k; trend=up]`

### Inner lists
Use commas for list items **within** a single field:

```markdown
@agent[CodeSentinel; Reviewer; done; tools=AST,Semgrep,Coverage]
@sparkline[38,41,45,49,58,62,71]
```

### Quoting
Only quote a value if it contains `;` or `=`:

```markdown
@kpi["Revenue; Q1"; $167k; +18%; QoQ]
```

### No-code rule
Never emit bridges inside code fences or backticks — the parser skips them.

---

## Core dTypes

| Type | Description | Recursive? |
|---|---|---|
| `B.string(name)` | A plain string. | Yes (cleaned) |
| `B.number(name)` | Numeric value. | Yes (casted) |
| `B.boolean(name)` | `true`/`false` or `yes`/`no`. | Yes (casted) |
| `B.enum(name, options)` | Restricts AI values. | Yes |
| `B.list(name, type)` | Comma-separated list. | **Recursive** |
| `B.keyvalue(name)` | Dictionary / Map. | **Recursive** |

### Field Attributes
Every field supports chainable metadata:
- `.describe(text)`: Base AI instruction.
- `.default(val)`: Fallback value.
- `.optional()`: Marks field as not required.
- `.examples([val1, val2])`: Injects concrete examples into the prompt.
- `.importance('high')`: Flags critical fields to the AI.

---

## Prompt Architecture

md4ai uses a **Two-Tier** prompting system to keep token counts low.

### 1. The Protocol (Tier 1)
Teaches the AI the universal bridge syntax once. Use `getBridgeProtocolPrompt()`.
> Use `@marker[val1; val2; key=val3]`. Semicolons separate fields; commas for inner lists. No bridges in code blocks.

### 2. The Catalog (Tier 2)
A compressed manifest of your registered bridges. Use `getPrompt({ bridges, mode: 'minimal' })`.
> - @kpi[label, value, change?, period?]
> - @servicemap[title?, note?, |nodes|, |edges|]

To generate these prompts:
```ts
import { getBridgeProtocolPrompt, getPrompt } from '@md4ai/core';

// 1. Get the universal protocol rules
const protocol = getBridgeProtocolPrompt();

// 2. Get the component manifest (Catalog)
const catalog = getPrompt({ bridges, mode: 'minimal' });
```

---

## Fallback Rendering For Malformed Payloads

For production bridges, define a `fallback` renderer so malformed model output never breaks the UI.

When parsing fails, md4ai passes the raw content between `[]` to `fallback(raw, ctx, info)`.

```tsx
import { defineBridge, B } from '@md4ai/core';

const strictKpi = defineBridge({
  marker: 'kpi',
  fields: [
    B.string('label'),
    B.number('value'),
  ],
  render: ({ label, value }) => <strong>{label}: {value}</strong>,
  fallback: (raw) => <code>@kpi[{raw}]</code>,
});
```

`info` includes:
- `marker`: bridge marker name
- `raw`: raw payload between `[]`
- `error`: parse or render error when available

Recommended pattern:
1. Keep `render` strict.
2. Keep `fallback` simple and visible.
3. Log `info.error` via debug events in development.
