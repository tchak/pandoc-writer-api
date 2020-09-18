import { Node } from 'unist';

export interface CitationItemType {
  id: string;
  prefix?: string;
  suffix?: string;
  locator?: string;
  label?: string;
  suppressAuthor?: boolean;
  authorOnly?: boolean;
}

export interface MdastNode extends Node {
  type: string;
  ordered?: boolean;
  value?: string;
  text?: string;
  children?: Array<MdastNode>;
  depth?: 1 | 2 | 3 | 4 | 5 | 6;
  url?: string;
  label?: string;
  identifier?: string;
  citationItems?: Array<CitationItemType>;
  lang?: string;
  // mdast metadata
  position?: any;
  spread?: any;
  checked?: any;
  indent?: any;
}

export interface LeafType {
  text: string;
  strikeThrough?: boolean;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  parentType?: string;
}

export interface BlockType {
  type: string;
  children: Array<BlockType | LeafType>;
  url?: string;
  parentType?: string;
  citationItems?: Array<CitationItemType>;
  content?: Array<BlockType | LeafType>;
  lang?: string;
}

export const defaultNodeTypes = {
  paragraph: 'paragraph',
  blockquote: 'blockquote',
  code: 'code',
  footnote: 'footnote',
  citation: 'citation',
  link: 'link',
  bulletedList: 'bulleted-list',
  numberedList: 'numbered-list',
  listItem: 'list-item',
  heading: {
    1: 'heading-one',
    2: 'heading-two',
    3: 'heading-three',
    4: 'heading-four',
    5: 'heading-five',
    6: 'heading-six',
  },
};
