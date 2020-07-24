import {
  NodeTypes,
  MdastNode,
  BlockType,
  LeafType,
  defaultNodeTypes,
} from './types';

export interface DeserializeOptions {
  nodeTypes?: NodeTypes;
}

export interface DeserializeContext {
  footnoteReferences: Record<string, BlockType>;
  footnoteDefinitions: Record<string, BlockType[]>;
}

export function assignFootnoteDefinitions(context: DeserializeContext): void {
  for (const identifier in context.footnoteReferences) {
    if (context.footnoteDefinitions[identifier]) {
      context.footnoteReferences[identifier].children =
        context.footnoteDefinitions[identifier];
    }
  }
}

export default function deserialize(
  node: MdastNode,
  opts: DeserializeOptions = { nodeTypes: defaultNodeTypes },
  context: DeserializeContext
): BlockType | LeafType {
  const { nodeTypes: userNodeTypes = defaultNodeTypes } = opts;

  const nodeTypes = {
    ...defaultNodeTypes,
    ...userNodeTypes,
    heading: {
      ...defaultNodeTypes.heading,
      ...userNodeTypes.heading,
    },
  };

  let children: Array<BlockType | LeafType> = [{ text: '' }];

  if (
    node.children &&
    Array.isArray(node.children) &&
    node.children.length > 0
  ) {
    children = node.children.map((c: MdastNode) =>
      deserialize(
        {
          ...c,
          ordered: node.ordered || false,
        },
        opts,
        context
      )
    );
  }

  switch (node.type) {
    case 'heading':
      return { type: nodeTypes.heading[node.depth || 1], children };
    case 'list':
      return {
        type: node.ordered ? nodeTypes.numberedList : nodeTypes.bulletedList,
        children,
      };
    case 'listItem':
      return { type: nodeTypes.listItem, children };
    case 'paragraph':
      return { type: nodeTypes.paragraph, children };
    case 'link':
      return { type: nodeTypes.link, url: node.url, children };
    case 'blockquote':
      return { type: nodeTypes.blockquote, children };
    case 'footnote':
      return {
        type: nodeTypes.footnote,
        children: [{ type: 'paragraph', children }],
      };
    case 'footnoteReference':
      const footnoteReference = {
        type: nodeTypes.footnote,
        children: [{ type: 'paragraph', children: [{ text: '' }] }],
      };
      context.footnoteReferences[node.identifier] = footnoteReference;
      return footnoteReference;
    case 'footnoteDefinition':
      context.footnoteDefinitions[node.identifier] = children as BlockType[];
      return { type: 'paragraph', children: [{ text: '' }] };

    case 'html':
      if (node.value?.includes('<br>')) {
        return {
          break: true,
          type: nodeTypes.paragraph,
          children: [{ text: node.value?.replace(/<br>/g, '') || '' }],
        };
      }
      // TODO: Handle other HTML?
      return { type: 'parapgraph', children: [{ text: '' }] };

    case 'inlineCode':
      return {
        code: true,
        ...forceLeafNode(children as LeafType[]),
        ...persistLeafFormats(children),
      };
    case 'emphasis':
      return {
        italic: true,
        ...forceLeafNode(children as LeafType[]),
        ...persistLeafFormats(children),
      };
    case 'strong':
      return {
        bold: true,
        ...forceLeafNode(children as LeafType[]),
        ...persistLeafFormats(children),
      };
    case 'delete':
      return {
        strikeThrough: true,
        ...forceLeafNode(children as LeafType[]),
        ...persistLeafFormats(children),
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
function persistLeafFormats(children: MdastNode[]) {
  return children.reduce((acc, node) => {
    Object.keys(node).forEach(function (key) {
      if (key === 'children' || key === 'type' || key === 'text') return;
      acc[key] = node[key];
    });

    return acc;
  }, {});
}
