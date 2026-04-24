import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { Plugin } from 'unified';

interface DirectiveNode {
  type: string;
  name: string;
  children?: Array<{ value?: string; [key: string]: unknown }>;
  attributes?: Record<string, string>;
}

const plugin: Plugin<[], Root> = () => (tree) => {
  visit(tree, (node: unknown, index, parent) => {
    const n = node as DirectiveNode;
    if (n.type !== 'leafDirective' && n.type !== 'containerDirective' && n.type !== 'textDirective') return;

    let richNode: unknown;

    if (n.name === 'button') {
      const label =
        n.children && n.children.length > 0
          ? n.children[0].value ?? ''
          : '';
      richNode = {
        type: 'button',
        data: {
          label,
          href: n.attributes?.href,
          variant: n.attributes?.variant ?? 'default',
        },
      };
    } else if (n.name === 'input') {
      const { type: inputType = 'text', ...rest } = n.attributes ?? {};
      richNode = { type: 'input', data: { inputType, props: rest } };
    } else if (n.name === 'kpi') {
      richNode = {
        type: 'kpi',
        data: {
          label: n.attributes?.label ?? 'Metric',
          value: n.attributes?.value ?? '—',
          change: n.attributes?.change,
          period: n.attributes?.period,
        },
      };
    } else if (n.name === 'card') {
      richNode = {
        type: 'card',
        data: { title: n.attributes?.title },
        children: n.children ?? [],
      };
    }

    if (richNode && parent && index != null) {
      ((parent as unknown as { children: unknown[] }).children)[index] = richNode;
    }
  });
};

export default plugin;
