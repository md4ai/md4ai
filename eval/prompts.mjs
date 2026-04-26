/**
 * Per-model prompt builder.
 *
 * Builds the system prompt for a given model+test-case pair by combining:
 *   1. md4ai's getPrompt() with the model's preferred mode
 *   2. The model's optional extraHint
 *   3. An optional per-case topic filter (so we only include relevant syntax)
 *
 * Per-model overrides are stored in MODEL_PROMPT_OVERRIDES and can be
 * refined after studying eval results — the key to minimising prompt tokens
 * without losing syntax compliance.
 */
import { getPrompt } from '../dist/core.js';

/**
 * Per-model prompt customisations.
 * Keys are model IDs. Values override any field of the getPrompt() options
 * or add a manual systemPrompt string.
 *
 * Priority: MODEL_PROMPT_OVERRIDES > model.extraHint > default getPrompt() call.
 */
export const MODEL_PROMPT_OVERRIDES = {
  // Llama 3.2 3B needs very explicit examples — it struggles with implicit syntax
  'meta/llama-3.2-3b-instruct': {
    mode: 'withExamples',
    includeBaseInstruction: true,
    preamble: 'You are a helpful assistant that responds using md4ai extended markdown syntax.',
  },

  // Mistral 7B v0.3 tends to wrap everything in JSON — hard override
  'mistralai/mistral-7b-instruct-v0.3': {
    mode: 'withExamples',
    preamble: 'You are a data assistant. Respond in md4ai extended markdown, not JSON.',
  },

  // Gemma 3 12B sometimes generates malformed directives — keep examples, add explicit fence reminder
  'google/gemma-3-12b-it': {
    mode: 'withExamples',
    suffix: '\nIMPORTANT: chart/steps/layout blocks must use triple backtick fences (```chart ... ```).',
  },

  // Large capable models — use minimal mode to save tokens
  'meta/llama-3.3-70b-instruct': { mode: 'minimal' },
  'nvidia/llama-3.1-nemotron-70b-instruct': { mode: 'minimal' },
  'deepseek-ai/deepseek-v3.1-terminus': { mode: 'minimal' },
  'qwen/qwen2.5-coder-32b-instruct': { mode: 'minimal' },
};

/**
 * Build the system prompt for a model+testcase pair.
 *
 * @param {import('./models.mjs').MODELS[number]} model
 * @param {import('./test-cases.mjs').TEST_CASES[number]} testCase
 * @returns {{ systemPrompt: string, estimatedPromptTokens: number }}
 */
export function buildSystemPrompt(model, testCase) {
  const override = MODEL_PROMPT_OVERRIDES[model.id] ?? {};
  const mode = override.mode ?? model.promptMode ?? 'standard';

  // Build getPrompt options — only include topics relevant to this test case
  const getPromptOptions = {
    mode,
    includeBuiltins: testCase.topics,  // filter to only what this test needs
    includeBaseInstruction: override.includeBaseInstruction !== false,
  };

  let prompt = getPrompt(getPromptOptions);

  // Prepend model-specific preamble
  if (override.preamble) {
    prompt = `${override.preamble}\n\n${prompt}`;
  } else {
    prompt = `You are a helpful assistant.\n\n${prompt}`;
  }

  // Append model-specific extra hint
  if (model.extraHint) {
    prompt = `${prompt}\n\n${model.extraHint}`;
  }

  // Append per-model suffix override
  if (override.suffix) {
    prompt = `${prompt}${override.suffix}`;
  }

  const estimatedPromptTokens = Math.ceil(prompt.length / 4);

  return { systemPrompt: prompt, estimatedPromptTokens };
}

/**
 * Return just the token count for a system prompt without building the full object.
 */
export function countPromptTokens(model, testCase) {
  return buildSystemPrompt(model, testCase).estimatedPromptTokens;
}
