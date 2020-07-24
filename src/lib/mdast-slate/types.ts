export interface NodeTypes {
  paragraph?: string;
  blockquote?: string;
  code?: string;
  footnote?: string;
  link?: string;
  bulletedList?: string;
  numberedList?: string;
  listItem?: string;
  heading?: {
    1?: string;
    2?: string;
    3?: string;
    4?: string;
    5?: string;
    6?: string;
  };
}

export interface MdastNode {
  type?: string;
  ordered?: boolean;
  value?: string;
  text?: string;
  children?: Array<MdastNode>;
  depth?: 1 | 2 | 3 | 4 | 5 | 6;
  url?: string;
  identifier?: string;
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
  break?: boolean;
  parentType?: string;
}

export const defaultNodeTypes = {
  paragraph: 'paragraph',
  blockquote: 'block-quote',
  code: 'code',
  footnote: 'footnote',
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
