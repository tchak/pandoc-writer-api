import { MdastNode, BlockType, LeafType, defaultNodeTypes } from './types';

export function slateToMdast(nodes: BlockType[]): MdastNode {
  const footnoteDefinitions: MdastNode[] = [];

  return {
    type: 'root',
    children: nodes
      .map((node) => createNode(node, footnoteDefinitions))
      .concat(footnoteDefinitions),
  };
}

function createNode(
  node: BlockType | LeafType,
  footnoteDefinitions: MdastNode[]
): MdastNode {
  if (isLeafNode(node)) {
    return createTextNode(node);
  } else if (node.type === defaultNodeTypes.code) {
    return { type: 'code', value: '', lang: node.lang };
  } else {
    const children = (node.content || node.children).map((node) =>
      createNode(node, footnoteDefinitions)
    );

    switch (node.type) {
      case defaultNodeTypes.heading[1]:
        return { type: 'heading', depth: 1, children };
      case defaultNodeTypes.heading[2]:
        return { type: 'heading', depth: 2, children };
      case defaultNodeTypes.heading[3]:
        return { type: 'heading', depth: 3, children };
      case defaultNodeTypes.heading[4]:
        return { type: 'heading', depth: 4, children };
      case defaultNodeTypes.heading[5]:
        return { type: 'heading', depth: 5, children };
      case defaultNodeTypes.heading[6]:
        return { type: 'heading', depth: 6, children };
      case defaultNodeTypes.numberedList:
        return { type: 'list', ordered: true, children };
      case defaultNodeTypes.bulletedList:
        return { type: 'list', ordered: false, children };
      case defaultNodeTypes.listItem:
        return { type: 'listItem', children };
      case defaultNodeTypes.paragraph:
        return { type: 'paragraph', children };
      case defaultNodeTypes.blockquote:
        return { type: 'blockquote', children };
      case defaultNodeTypes.link:
        return { type: 'link', url: node.url, children };
      case defaultNodeTypes.citation:
        return { type: 'citation', citationItems: node.citationItems };
      case defaultNodeTypes.footnote:
        return createFootnote(footnoteDefinitions, children);
    }
  }
}

function createTextNode({
  text,
  bold,
  italic,
  strikeThrough,
  code,
}: LeafType): MdastNode {
  let node: MdastNode = { type: 'text', value: text };

  if (bold) {
    node = { type: 'strong', children: [node] };
  }
  if (italic) {
    node = { type: 'emphasis', children: [node] };
  }
  if (strikeThrough) {
    node = { type: 'delete', children: [node] };
  }
  if (code) {
    node = { type: 'inlineCode', children: [node] };
  }

  return node;
}

function createFootnote(
  footnoteDefinitions: MdastNode[],
  children: MdastNode[]
): MdastNode {
  const identifier = `${footnoteDefinitions.length + 1}`;
  footnoteDefinitions.push({
    type: 'footnoteDefinition',
    identifier,
    children,
  });
  return {
    type: 'footnoteReference',
    identifier: identifier,
    label: identifier,
  };
}

function isLeafNode(node: BlockType | LeafType): node is LeafType {
  return typeof (node as LeafType).text === 'string';
}
