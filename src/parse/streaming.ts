import { parse } from './index.js';
import type { IRNode, ParseOptions } from '../types.js';

/**
 * Close any unclosed fenced blocks so the normal parser doesn't choke on
 * partial streaming input. Handles:
 *   - Backtick code fences  (``` or ```chart)
 *   - Container directives  (:::card ... :::)
 */
function closePendingBlocks(text: string): string {
  const lines = text.split('\n');

  // Track open backtick fences
  let openFence: string | null = null;
  const openDirectives: string[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();

    // Backtick fence: three or more backticks
    const fenceMatch = trimmed.match(/^(`{3,})/);
    if (fenceMatch) {
      if (openFence === null) {
        openFence = fenceMatch[1];
      } else if (trimmed.startsWith(openFence) && trimmed.slice(openFence.length).trim() === '') {
        openFence = null;
      }
      continue;
    }

    // Only track directives outside of fences
    if (openFence === null) {
      const dirOpen = trimmed.match(/^:::[a-zA-Z]/);
      const dirClose = trimmed === ':::';
      if (dirOpen) {
        openDirectives.push(':::');
      } else if (dirClose && openDirectives.length > 0) {
        openDirectives.pop();
      }
    }
  }

  let patched = text;

  // Close open fence — append its closer on a new line
  if (openFence !== null) {
    if (!patched.endsWith('\n')) patched += '\n';
    patched += openFence + '\n';
  }

  // Close open directives (innermost first)
  for (let i = openDirectives.length - 1; i >= 0; i--) {
    if (!patched.endsWith('\n')) patched += '\n';
    patched += ':::\n';
  }

  return patched;
}

/**
 * Lenient parser for streaming AI responses.
 *
 * Call this on the full accumulated text each time a new chunk arrives.
 * Unclosed fenced blocks (```chart, :::card, etc.) are auto-closed so
 * the parser never throws, and partial content renders immediately.
 */
export function parseStreaming(markdown: string, options: ParseOptions = {}): IRNode[] {
  const patched = closePendingBlocks(markdown);
  return parse(patched, options);
}
