# Bridge Inspector & Debug Pipeline

This feature adds a structured debugging layer across parsing, bridge resolution, rendering, and store access. Use it to quickly identify whether a failure comes from markdown input, bridge syntax, schema parsing, store integration, or component render logic.

## Goals

- Make failures observable with typed events.
- Keep production behavior safe (no hard crashes on malformed bridge payloads).
- Support local devtools/inspector UIs without coupling to any specific framework.

## API Surface

Enable debug on parse and render:

```ts
import { parse, renderContent, createInspectorStore } from '@md4ai/core';

const inspector = createInspectorStore(800);
const debug = { enabled: true, onEvent: inspector.onEvent };

const nodes = parse(markdown, { bridges, debug });
const ui = renderContent(nodes, { bridges, debug, store, onEvent });
```

You can also pass `onDebugEvent` directly if you do not need a store:

```ts
parse(markdown, { bridges, onDebugEvent: (event) => console.log(event) });
```

## Event Stages

- `markdown.parse.start` / `markdown.parse.end`
- `bridge.detected`
- `bridge.parse.success` / `bridge.parse.fail`
- `bridge.render.success` / `bridge.render.fail`
- `bridge.fallback.used`
- `store.query.success` / `store.query.fail`
- `store.emit.success` / `store.emit.fail`

Bridge detection and parse events include `marker`, `raw`, and source `location` (`line`, `column`, `offset`).

## Error Codes

- `E_BRIDGE_PARSE`
- `E_SCHEMA_FIELD_MISSING`
- `E_SCHEMA_ENUM_INVALID`
- `E_SCHEMA_NUMBER_INVALID`
- `E_SCHEMA_UNKNOWN_FIELD`
- `E_SCHEMA_TOO_MANY_POSITIONAL`
- `E_STORE_QUERY_FAILED`
- `E_STORE_EMIT_FAILED`
- `E_RENDER_THROW`

Use these as stable diagnostics in logs, tests, and dashboards.

## Troubleshooting Flow

1. Check `bridge.detected` to confirm token recognition and source location.
2. If `bridge.parse.fail`, inspect `raw` and code (`E_SCHEMA_*`).
3. If parse succeeds but UI fails, inspect `bridge.render.fail`.
4. If bridge render depends on external state, inspect `store.query.*` / `store.emit.*`.
5. Verify `bridge.fallback.used` is present for graceful degradation paths.

## Production Guidance

- Keep debug disabled by default in production.
- Use fallback renderers on strict bridges to avoid blank UI when payloads are malformed.
- If you sample debug events in production, redact sensitive values from `raw` before exporting.
