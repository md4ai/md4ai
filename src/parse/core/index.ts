import type { IRNode } from '../../types.js';
import type { ParseOptions } from '../../types.js';
import { makeState } from './state.js';
import { parseBlocks } from './blocks.js';

export function parse(markdown: string, options: ParseOptions = {}): IRNode[] {
  const { bridges = [] } = options;
  return parseBlocks(makeState(markdown, bridges));
}

// Streaming variant: close unclosed fences before parsing
export function parseStreaming(markdown: string, options: ParseOptions = {}): IRNode[] {
  return parse(closePending(markdown), options);
}

// Close unclosed fenced blocks (``` or ~~~) and unclosed @marker[ spans.
// Trailing incomplete bridges are closed with a \x00 sentinel so the parser
// can produce a partial bridge node and the renderer can show a skeleton.
function closePending(text: string): string {
  let result = text;

  // Close unclosed backtick fences
  const backtickFences = [...result.matchAll(/^(`{3,}|~{3,})[\w-]*/gm)];
  if (backtickFences.length % 2 !== 0) {
    result += '\n' + backtickFences[backtickFences.length - 1][1];
  }

  // Close trailing incomplete @marker[ with a partial sentinel instead of dropping it.
  // The \x00 byte is stripped by scanInline, which sets partial: true on the node.
  result = result.replace(/(@[a-z][a-z0-9-]*\[[^\]]*)$/, '$1\x00]');

  return result;
}
