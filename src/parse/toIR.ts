import type { Root, PhrasingContent, TableRow, TableCell } from 'mdast';
import type { IRNode, InlineNode, CalloutVariant } from '../types.js';
import type { BridgeDefinition } from '../bridge.js';

type AnyNode = { type: string; [key: string]: unknown };

function inlineToIR(nodes: PhrasingContent[], bridges?: BridgeDefinition[]): InlineNode[] {
  return nodes.flatMap((n): InlineNode[] => {
    const node = n as AnyNode;
    switch (node.type) {
      case 'text':
        return [{ type: 'text', value: node.value as string }];
      case 'strong':
        return [{ type: 'strong', children: inlineToIR((node.children as PhrasingContent[]), bridges) }];
      case 'emphasis':
        return [{ type: 'emphasis', children: inlineToIR((node.children as PhrasingContent[]), bridges) }];
      case 'inlineCode':
        return [{ type: 'inlineCode', value: node.value as string }];
      case 'link':
        return [{ type: 'link', href: node.url as string, children: inlineToIR((node.children as PhrasingContent[]), bridges) }];
      case 'image':
        return [{ type: 'image', src: node.url as string, alt: (node.alt as string) ?? '' }];
      case 'break':
        return [{ type: 'break' }];
      case 'bridge': {
        const marker = node.marker as string;
        const raw = node.raw as string;
        const bridge = bridges?.find((b) => b.marker === marker);
        const data = bridge ? bridge._parse(raw) : raw;
        return [{ type: 'bridge', marker, raw, data }];
      }
      default:
        return [];
    }
  });
}

function cellsToIR(cells: TableCell[], bridges?: BridgeDefinition[]): InlineNode[][] {
  return cells.map((cell) => inlineToIR(cell.children, bridges));
}

function nodeToIR(node: AnyNode, bridges?: BridgeDefinition[]): IRNode | null {
  switch (node.type) {
    case 'paragraph':
      return { type: 'paragraph', children: inlineToIR(node.children as PhrasingContent[], bridges) };

    case 'heading':
      return {
        type: 'heading',
        level: node.depth as 1 | 2 | 3 | 4 | 5 | 6,
        children: inlineToIR(node.children as PhrasingContent[], bridges),
      };

    case 'code':
      return { type: 'code', lang: (node.lang as string | null) ?? '', value: node.value as string };

    case 'blockquote':
      return { type: 'blockquote', children: contentToIR(node.children as AnyNode[], bridges) };

    case 'list': {
      const listItems = node.children as AnyNode[];
      const items = listItems.map((item) => contentToIR(item.children as AnyNode[], bridges));
      const checkedItems = listItems.map((item) => {
        const checked = (item as { checked?: boolean | null }).checked;
        return checked === true || checked === false ? checked : null;
      });
      const isTaskList = checkedItems.some((c) => c !== null);
      return {
        type: 'list',
        ordered: !!(node.ordered as boolean),
        items,
        ...(isTaskList ? { checkedItems } : {}),
      };
    }

    case 'table': {
      const rows = node.children as TableRow[];
      const [headRow, ...bodyRows] = rows;
      return {
        type: 'table',
        head: cellsToIR(headRow?.children ?? [], bridges),
        rows: bodyRows.map((row) => cellsToIR(row.children, bridges)),
      };
    }

    case 'thematicBreak':
      return { type: 'thematicBreak' };

    case 'callout': {
      const data = node.data as { variant: CalloutVariant };
      return {
        type: 'callout',
        variant: data.variant,
        children: contentToIR(node.children as AnyNode[], bridges),
      };
    }

    case 'chart': {
      if (!node.data) return { type: 'chart', chartType: 'bar', data: null };
      const data = node.data as { chartType: string } & Record<string, unknown>;
      const { chartType, ...rest } = data;
      return { type: 'chart', chartType, data: rest };
    }

    case 'video': {
      const data = node.data as { src: string };
      return { type: 'video', src: data.src };
    }

    case 'button': {
      const data = node.data as { label: string; href?: string; variant?: string };
      return { type: 'button', label: data.label, href: data.href, variant: data.variant };
    }

    case 'input': {
      const data = node.data as { inputType: string; props: Record<string, string> };
      return { type: 'input', inputType: data.inputType, props: data.props };
    }

    case 'layout': {
      const data = node.data as { columns: number; sectionTrees: AnyNode[][] };
      return {
        type: 'layout',
        columns: data.columns,
        children: data.sectionTrees.map((children) => contentToIR(children, bridges)),
      };
    }

    case 'card': {
      const data = node.data as { title?: string };
      return { type: 'card', title: data?.title, children: contentToIR(node.children as AnyNode[], bridges) };
    }

    default:
      return null;
  }
}

function contentToIR(nodes: AnyNode[], bridges?: BridgeDefinition[]): IRNode[] {
  return nodes.flatMap((n) => {
    const ir = nodeToIR(n, bridges);
    return ir ? [ir] : [];
  });
}

export function rootToIR(root: Root, bridges?: BridgeDefinition[]): IRNode[] {
  return contentToIR(root.children as unknown as AnyNode[], bridges);
}
