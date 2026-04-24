import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';
import type { Plugin } from 'unified';

const RICH_LANGS = new Set(['chart', 'video', 'layout']);

const plugin: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'code', (node: Code, index, parent) => {
    const lang = (node.lang ?? '').toLowerCase().split(/\s/)[0];
    if (!RICH_LANGS.has(lang)) return;

    let richNode: unknown;

    if (lang === 'chart') {
      try {
        const data = JSON.parse(node.value);
        richNode = { type: 'chart', data: { chartType: data.type ?? 'bar', ...data } };
      } catch {
        // Partial/invalid JSON during streaming — emit a pending placeholder
        richNode = { type: 'chart', data: null };
      }
    } else if (lang === 'video') {
      richNode = { type: 'video', data: { src: node.value.trim() } };
    } else if (lang === 'layout') {
      const metaStr = node.meta ?? '';
      const colMatch = metaStr.match(/columns=(\d+)/);
      const columns = colMatch ? parseInt(colMatch[1], 10) : 2;
      const sections = node.value.split(/^---$/m).map((s) => s.trim());
      const sectionParser = unified().use(remarkParse).use(remarkGfm);
      const sectionTrees = sections.map((s) => sectionParser.parse(s).children);
      richNode = { type: 'layout', data: { columns, sectionTrees } };
    }

    if (richNode && parent && index != null) {
      (parent.children as unknown[])[index] = richNode;
    }
  });
};

export default plugin;
