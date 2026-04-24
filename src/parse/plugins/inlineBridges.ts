import type { Plugin } from 'unified';
import type { Root, Text, Parent } from 'mdast';
import { visit, SKIP } from 'unist-util-visit';
import type { BridgeDefinition } from '../../bridge.js';

// Matches @marker[data] — bracket requirement naturally excludes emails and bare mentions
const BRIDGE_RE = /@([a-z][a-z0-9-]*)\[([^\]]*)\]/g;

export function inlineBridgesPlugin(bridges: BridgeDefinition[]): Plugin<[], Root> {
  const markerSet = new Set(bridges.map((b) => b.marker));

  return () => (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index == null) return;

      const text = node.value;
      const parts: unknown[] = [];
      let lastIndex = 0;

      BRIDGE_RE.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = BRIDGE_RE.exec(text)) !== null) {
        const [full, marker, raw] = match;
        if (!markerSet.has(marker)) continue;

        // Guard: @ must not be preceded by a word character (excludes word@email style)
        const charBefore = match.index > 0 ? text[match.index - 1] : ' ';
        if (/[a-zA-Z0-9._]/.test(charBefore)) continue;

        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        parts.push({ type: 'bridge', marker, raw });
        lastIndex = match.index + full.length;
      }

      if (parts.length === 0) return;

      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      // Replace the single text node with the split array
      (parent.children as unknown[]).splice(index, 1, ...parts);
      return SKIP;
    });
  };
}
