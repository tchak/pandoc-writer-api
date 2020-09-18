import { MdastNode, BlockType, LeafType, defaultNodeTypes } from './types';

export function mdastToSlate(node: MdastNode): BlockType[] {
  const footnoteReferences: Record<string, BlockType> = {};
  const footnoteDefinitions: Record<string, BlockType[]> = {};

  const nodes = node.children
    .map((node) => createNode(node, footnoteReferences, footnoteDefinitions))
    .filter((node) => node);
  assignFootnoteDefinitions(footnoteReferences, footnoteDefinitions);

  return nodes as BlockType[];
}

export function assignFootnoteDefinitions(
  footnoteReferences: Record<string, BlockType>,
  footnoteDefinitions: Record<string, BlockType[]>
): void {
  for (const identifier in footnoteReferences) {
    if (footnoteDefinitions[identifier]) {
      footnoteReferences[identifier].content = footnoteDefinitions[identifier];
    }
  }
}

export default function createNode(
  node: MdastNode,
  footnoteReferences: Record<string, BlockType>,
  footnoteDefinitions: Record<string, BlockType[]>
): BlockType | LeafType {
  let children: Array<BlockType | LeafType> = [{ text: '' }];

  if (
    node.children &&
    Array.isArray(node.children) &&
    node.children.length > 0
  ) {
    children = node.children.map((child: MdastNode) =>
      createNode(
        {
          ...child,
          ordered: node.ordered || false,
        },
        footnoteReferences,
        footnoteDefinitions
      )
    );
  }

  switch (node.type) {
    case 'heading':
      return { type: defaultNodeTypes.heading[node.depth || 1], children };
    case 'list':
      return {
        type: node.ordered
          ? defaultNodeTypes.numberedList
          : defaultNodeTypes.bulletedList,
        children,
      };
    case 'listItem':
      return { type: defaultNodeTypes.listItem, children };
    case 'paragraph':
      return { type: defaultNodeTypes.paragraph, children };
    case 'link':
      return { type: defaultNodeTypes.link, url: node.url, children };
    case 'blockquote':
      return { type: defaultNodeTypes.blockquote, children };
    case 'footnote':
      return {
        type: defaultNodeTypes.footnote,
        children: [{ text: '' }],
        content: [{ type: 'paragraph', children }],
      };
    case 'footnoteReference':
      const footnoteReference = {
        type: defaultNodeTypes.footnote,
        children: [{ text: '' }],
        content: [{ type: 'paragraph', children: [{ text: '' }] }],
      };
      footnoteReferences[node.identifier] = footnoteReference;
      return footnoteReference;
    case 'footnoteDefinition':
      footnoteDefinitions[node.identifier] = children as BlockType[];
      return null;
    case 'inlineCode':
      return {
        code: true,
        ...forceLeafNode(children as LeafType[]),
        ...persistLeafFormats(children as LeafType[]),
      };
    case 'emphasis':
      return {
        italic: true,
        ...forceLeafNode(children as LeafType[]),
        ...persistLeafFormats(children as LeafType[]),
      };
    case 'strong':
      return {
        bold: true,
        ...forceLeafNode(children as LeafType[]),
        ...persistLeafFormats(children as LeafType[]),
      };
    case 'delete':
      return {
        strikeThrough: true,
        ...forceLeafNode(children as LeafType[]),
        ...persistLeafFormats(children as LeafType[]),
      };

    case 'text':
    default:
      return { text: node.value || '' };
  }
}

const forceLeafNode = (children: LeafType[]) => ({
  text: children.map((k) => k?.text).join(''),
});

// This function is will take any unknown keys, and bring them up a level
// allowing leaf nodes to have many different formats at once
// for example, bold and italic on the same node
function persistLeafFormats(children: LeafType[]) {
  return children.reduce((acc, node) => {
    Object.keys(node).forEach(function (key) {
      if (key === 'children' || key === 'type' || key === 'text') return;
      acc[key] = node[key];
    });

    return acc;
  }, {});
}
