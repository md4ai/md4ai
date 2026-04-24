# Contributing

Thanks for helping improve `md4ai`.

## Local Setup

1. Install root dependencies with `npm ci`.
2. Install demo dependencies with `npm --prefix examples/demo ci`.
3. Start the playground with `npm run dev`.
4. Run the fast regression suite with `npm test`.

## What To Change Where

- Put parser and renderer changes in `src/`.
- Use `examples/demo/` for manual verification and documentation examples.
- Treat `dist/` as generated output.
- Put regression coverage in `test/` unless a future feature needs a more targeted test location.
- Prefer docs in `README.md` for API discoverability and `docs/` for production or contributor workflows.

## Validation

Before opening a PR, run:

```bash
npm run typecheck
npm test
npm run build:demo
```

`npm test` rebuilds the library and runs the parser regression suite in `test/`.

When you touch fallback or streaming behavior, add a regression test that proves the parser stays renderable for incomplete input rather than only testing the fully closed markdown case.

Useful current coverage areas:

- Rich fence fallback such as partial `chart`, `video`, and `layout` blocks
- Directive auto-close behavior for `:::card`
- Bridge parsing safety around emails, bare mentions, and unknown markers
- Existing GFM behavior such as task list state

## Pull Requests

- Keep PRs focused and easy to review.
- Explain user-facing changes and note any API impact.
- Include screenshots or short recordings for rendering changes.
- Add or update tests when parser or rendering behavior changes.
- Call out any intentionally lenient fallback behavior so reviewers know it is part of the contract, not an accident.
