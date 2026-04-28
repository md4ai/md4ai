# Architecture Overview

`md4ai` is a small pipeline with three layers:

## Parsing

`src/parse/core/` contains a custom recursive-descent markdown parser with zero external dependencies. It produces a stable intermediate representation (IR). The parser handles:

- All standard markdown: headings, paragraphs, bold, emphasis, links, images, blockquotes, lists, tables, code blocks, horizontal rules, task lists
- md4ai extensions: callouts (`> [!NOTE]`), fenced rich blocks (`chart`, `video`, `layout`, `steps`, `timeline`), and inline bridges (`@marker[...]`)
- Streaming: `parseStreaming` auto-closes unclosed fences and drops trailing incomplete bridge spans so partial LLM output never throws

Key files:
- `src/parse/core/index.ts` — `parse()` and `parseStreaming()` entry points
- `src/parse/core/blocks.ts` — block-level parser dispatching all fence types, callouts, tables, lists
- `src/parse/core/inline.ts` — `scanInline()` for bridges, bold, emphasis, links, images
- `src/parse/core/state.ts` — `ParseState`, `forkState()` for recursive parsing inside layout columns

## Rendering

`src/renderers/html/` turns IR nodes into React elements. `renderContent()` provides themed default components while still allowing host apps to override individual node renderers.

The package keeps the public surface in one place:

- `@md4ai/core` exports parsing, streaming, bridges, prompts, `renderContent()`, themes, and renderer override types

The renderer intentionally separates parsing from presentation:

- Parsing produces plain IR nodes with no React dependency.
- Rendering consumes that IR with theme tokens, component overrides, and bridge context.
- Missing bridge renderers degrade visibly instead of breaking the whole render tree.

## Streaming And Fallbacks

`parseStreaming` is a thin lenient wrapper around `parse()`. Before parsing, it auto-closes trailing fenced blocks and drops open `@marker[` spans so incomplete LLM output remains renderable.

Current fallback behavior:

- Partial `chart` JSON becomes a `chart` node with `data: null` (renders as shimmer skeleton).
- Partial `video` and `layout` fences still resolve into IR nodes.
- Generic unfinished code fences are closed and preserved as normal code blocks.
- An open `@marker[` at the end of the text is stripped rather than rendered.

## Extension Points

The public extension surface is small on purpose:

- `defineBridge()` adds inline `@marker[data]` tokens with predictable parsing and auto-generated AI prompts.
- `renderContent(..., { components })` swaps renderer implementations without changing the parser.
- `renderContent(..., { theme })` scopes CSS variable overrides to a single content tree.

## Bridge Syntax

Bridges use `;` as the field separator (safe in all markdown contexts — tables, blockquotes, lists). Commas separate inner list items within a single field.

```markdown
@kpi[Revenue; $167k; +18%; QoQ]
@agent[CodeSentinel; Reviewer; done; tools=AST,Semgrep]
```

## Demo App

`examples/demo/` is a consumer of the library, not the source of truth. It exists for manual QA, examples, and GitHub Pages deployment. Keep reusable library logic in `src/` and avoid letting the demo become the only place behavior is documented.
