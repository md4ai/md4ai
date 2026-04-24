import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import type { Root } from 'mdast';
import type { ParseOptions, IRNode } from '../types.js';
import calloutsPlugin from './plugins/callouts.js';
import fenceBlocksPlugin from './plugins/fenceBlocks.js';
import directivesPlugin from './plugins/directives.js';
import { inlineBridgesPlugin } from './plugins/inlineBridges.js';
import { rootToIR } from './toIR.js';

export function parse(markdown: string, options: ParseOptions = {}): IRNode[] {
  const { gfm = true, bridges = [] } = options;

  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(calloutsPlugin)
    .use(fenceBlocksPlugin)
    .use(directivesPlugin);

  if (gfm) processor.use(remarkGfm);
  if (bridges.length > 0) processor.use(inlineBridgesPlugin(bridges));

  const tree = processor.parse(markdown);
  processor.runSync(tree);

  return rootToIR(tree as Root, bridges);
}
