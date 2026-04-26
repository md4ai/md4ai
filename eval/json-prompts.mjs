/**
 * Generates an estimated JSON System Prompt for a given test case
 * to create a fair head-to-head comparison with md4ai.
 */
export function getJsonSystemPrompt(testCase) {
  const schema = testCase.jsonEquivalent
    ? JSON.parse(testCase.jsonEquivalent)
    : { note: 'No data structure available' };

  // Create a descriptive schema from the object keys
  const schemaDescription = generateSchemaStub(schema);

  return `You are a helpful assistant. Return your response in JSON format according to this schema:
${JSON.stringify(schemaDescription, null, 2)}
Do not include any prose, markdown, or explanations. Only valid minified JSON.`;
}

/** Simplifies an object into a schema-like stub for prompt estimation. */
function generateSchemaStub(obj) {
  if (Array.isArray(obj)) {
    return [generateSchemaStub(obj[0])];
  }
  if (typeof obj === 'object' && obj !== null) {
    const stub = {};
    for (const [key, value] of Object.entries(obj)) {
      stub[key] = generateSchemaStub(value);
    }
    return stub;
  }
  return typeof obj;
}

/** Returns the JSON system prompt string. */
export function getJsonSystemPromptForCase(testCase) {
  return getJsonSystemPrompt(testCase);
}
