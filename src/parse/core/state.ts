import type { BridgeDefinition } from '../../bridge.js';

export interface ParseState {
  lines: string[];
  pos: number;
  bridges: BridgeDefinition[];
  bridgeSet: Set<string>;
}

export function makeState(markdown: string, bridges: BridgeDefinition[]): ParseState {
  return {
    lines: markdown.replace(/\r\n?/g, '\n').split('\n'),
    pos: 0,
    bridges,
    bridgeSet: new Set(bridges.map((b) => b.marker)),
  };
}

export function cur(s: ParseState): string {
  return s.lines[s.pos] ?? '';
}

export function peek(s: ParseState, offset: number): string {
  return s.lines[s.pos + offset] ?? '';
}

export function done(s: ParseState): boolean {
  return s.pos >= s.lines.length;
}

export function isBlank(line: string): boolean {
  return line.trim() === '';
}

export function skipBlanks(s: ParseState): void {
  while (!done(s) && isBlank(cur(s))) s.pos++;
}

export function forkState(s: ParseState, lines: string[]): ParseState {
  return { lines, pos: 0, bridges: s.bridges, bridgeSet: s.bridgeSet };
}
