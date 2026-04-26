/**
 * Curated list of NVIDIA NIM instruction-following text models.
 * Each entry carries per-model prompt config to minimize token usage
 * while still eliciting correct md4ai syntax.
 *
 * promptMode: which getPrompt() mode to use by default
 *   'minimal'      — shortest prompt, assume smart model
 *   'standard'     — medium detail
 *   'withExamples' — full syntax examples (use for weaker models)
 *
 * extraHint: appended after the md4ai system prompt.
 *   Use to correct known quirks without bloating the base prompt.
 *
 * maxTokens: cap output tokens to control cost / speed.
 */
export const MODELS = [
  // ── Meta Llama ──────────────────────────────────────────────────────
  {
    id: 'meta/llama-3.2-3b-instruct',
    family: 'llama',
    sizeB: 3,
    promptMode: 'withExamples',      // small model needs examples
    maxTokens: 512,
    extraHint: 'Follow the syntax exactly. Do not invent new markers.',
  },
  {
    id: 'meta/llama-3.1-8b-instruct',
    family: 'llama',
    sizeB: 8,
    promptMode: 'withExamples',      // Optimized with examples
    maxTokens: 700,
    extraHint: null,
  },
  {
    id: 'meta/llama-3.3-70b-instruct',
    family: 'llama',
    sizeB: 70,
    promptMode: 'minimal',           // large model, concise prompt
    maxTokens: 900,
    extraHint: null,
  },
  {
    id: 'meta/llama-3.1-70b-instruct',
    family: 'llama',
    sizeB: 70,
    promptMode: 'minimal',
    maxTokens: 900,
    extraHint: null,
  },
  {
    id: 'meta/llama-3.1-405b-instruct',
    family: 'llama',
    sizeB: 405,
    promptMode: 'minimal',
    maxTokens: 1000,
    extraHint: null,
  },
  {
    id: 'meta/llama-4-maverick-17b-128e-instruct',
    family: 'llama',
    sizeB: 17,
    promptMode: 'standard',
    maxTokens: 800,
    extraHint: null,
  },

  // ── Google Gemma ─────────────────────────────────────────────────────
  {
    id: 'google/gemma-3-12b-it',
    family: 'gemma',
    sizeB: 12,
    promptMode: 'withExamples',
    maxTokens: 700,
    extraHint: 'Only use syntax from the examples above. Never use HTML.',
  },
  {
    id: 'google/gemma-3-27b-it',
    family: 'gemma',
    sizeB: 27,
    promptMode: 'standard',
    maxTokens: 800,
    extraHint: null,
  },
  {
    id: 'google/gemma-3-4b-it',
    family: 'gemma',
    sizeB: 4,
    promptMode: 'withExamples',
    maxTokens: 600,
    extraHint: null,
  },
  {
    id: 'google/gemma-2-9b-it',
    family: 'gemma',
    sizeB: 9,
    promptMode: 'withExamples',
    maxTokens: 600,
    extraHint: null,
  },
  {
    id: 'google/gemma-2-2b-it',
    family: 'gemma',
    sizeB: 2,
    promptMode: 'withExamples',
    maxTokens: 400,
    extraHint: null,
  },
  {
    id: 'google/gemma-3n-e2b-it',
    family: 'gemma',
    sizeB: 2,
    promptMode: 'withExamples',
    maxTokens: 400,
    extraHint: null,
  },

  // ── Microsoft Phi ─────────────────────────────────────────────────────
  {
    id: 'microsoft/phi-4-mini-instruct',
    family: 'phi',
    sizeB: 4,
    promptMode: 'withExamples',
    maxTokens: 500,
    extraHint: 'Be concise. Use md4ai markers instead of plain text repetition.',
  },
  {
    id: 'microsoft/phi-3-mini-4k-instruct',
    family: 'phi',
    sizeB: 3.8,
    promptMode: 'withExamples',
    maxTokens: 500,
    extraHint: null,
  },
  {
    id: 'microsoft/phi-3-medium-4k-instruct',
    family: 'phi',
    sizeB: 14,
    promptMode: 'standard',
    maxTokens: 700,
    extraHint: null,
  },

  // ── Qwen ──────────────────────────────────────────────────────────────
  {
    id: 'qwen/qwen2.5-coder-32b-instruct',
    family: 'qwen',
    sizeB: 32,
    promptMode: 'minimal',
    maxTokens: 800,
    extraHint: null,
  },
  {
    id: 'qwen/qwen3-coder-480b-a35b-instruct',
    family: 'qwen',
    sizeB: 480,
    promptMode: 'minimal',
    maxTokens: 1000,
    extraHint: null,
  },

  // ── NVIDIA Nemotron ───────────────────────────────────────────────────
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    family: 'nemotron',
    sizeB: 70,
    promptMode: 'minimal',
    maxTokens: 900,
    extraHint: null,
  },
  {
    id: 'nvidia/llama-3.1-nemotron-51b-instruct',
    family: 'nemotron',
    sizeB: 51,
    promptMode: 'minimal',
    maxTokens: 900,
    extraHint: null,
  },
  {
    id: 'nvidia/llama-3.1-nemotron-nano-8b-v1',
    family: 'nemotron',
    sizeB: 8,
    promptMode: 'standard',
    maxTokens: 600,
    extraHint: null,
  },

  // ── DeepSeek ──────────────────────────────────────────────────────────
  {
    id: 'deepseek-ai/deepseek-v3.1-terminus',
    family: 'deepseek',
    sizeB: null,
    promptMode: 'minimal',
    maxTokens: 900,
    extraHint: null,
  },
  {
    id: 'deepseek-ai/deepseek-v4-flash',
    family: 'deepseek',
    sizeB: null,
    promptMode: 'minimal',
    maxTokens: 800,
    extraHint: null,
  },

  // ── GLM ───────────────────────────────────────────────────────────────
  {
    id: 'z-ai/glm-5.1',
    family: 'glm',
    sizeB: null,
    promptMode: 'standard',
    maxTokens: 900,
    extraHint: null,
  },

  // ── Mistral ───────────────────────────────────────────────────────────
  {
    id: 'mistralai/mixtral-8x7b-instruct-v0.1',
    family: 'mixtral',
    sizeB: 47,
    promptMode: 'standard',
    maxTokens: 800,
    extraHint: null,
  },
  {
    id: 'mistralai/ministral-14b-instruct-2512',
    family: 'ministral',
    sizeB: 14,
    promptMode: 'standard',
    maxTokens: 700,
    extraHint: null,
  },
];

/** Models to skip for quick smoke runs (large / slow). */
export const QUICK_MODELS = MODELS.filter((m) => m.sizeB !== null && m.sizeB <= 32);
