import remark from 'remark';
import footnotes from 'remark-footnotes';

export { MdastNode, BlockType, LeafType } from './types';
export { citations } from './citations';
export { slateToMdast } from './slate-to-mdast';
export { mdastToSlate } from './mdast-to-slate';

import { BlockType } from './types';
import { citations } from './citations';
import { slateToMdast } from './slate-to-mdast';
import { mdastToSlate } from './mdast-to-slate';

export function parse(markdown: string): BlockType[] {
  const mdast = remark()
    .use(footnotes, { inlineNotes: true })
    .use(citations)
    .parse(markdown);
  return mdastToSlate(mdast);
}

export function stringify(nodes: BlockType[]): string {
  const mdast = slateToMdast(nodes);
  return remark()
    .use(footnotes, { inlineNotes: true })
    .use(citations)
    .stringify(mdast)
    .toString();
}
