import { visit } from 'unist-util-visit';
import type { Root, Blockquote, Paragraph, Text } from 'mdast';
import type { Plugin } from 'unified';
import type { CalloutVariant } from '../../types.js';

const CALLOUT_RE = /^\[!(NOTE|WARNING|TIP|DANGER|INFO)\]\s*/i;

const plugin: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
    const first = node.children[0];
    if (first?.type !== 'paragraph') return;
    const firstText = first.children[0];
    if (firstText?.type !== 'text') return;

    const match = firstText.value.match(CALLOUT_RE);
    if (!match) return;

    const variant = match[1].toLowerCase() as CalloutVariant;
    const remaining = firstText.value.slice(match[0].length).trimStart();

    const newChildren = [...node.children];
    const newFirst: Paragraph = {
      ...first,
      children:
        remaining
          ? [{ type: 'text', value: remaining } as Text, ...first.children.slice(1)]
          : first.children.slice(1),
    };
    if (newFirst.children.length === 0) newChildren.shift();
    else newChildren[0] = newFirst;

    const calloutNode = {
      type: 'callout' as const,
      data: { variant },
      children: newChildren,
    };

    if (parent && index != null) {
      (parent.children as unknown[])[index] = calloutNode;
    }
  });
};

export default plugin;
