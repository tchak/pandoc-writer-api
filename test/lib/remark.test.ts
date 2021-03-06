import { test } from 'tap';

import { parse, stringify } from '../../src/lib/unist';

const mdWithFootnotes = `
Here is a footnote reference,[^1]
another,[^longnote],
and optionally there are inline
notes.^[you can type them inline, which may be easier, since you don’t
have to pick an identifier and move down to type the note.]

[^1]: Here is the footnote.

[^longnote]: Here’s one with multiple blocks.

    Subsequent paragraphs are indented to show that they
belong to the previous footnote.

        { some.code }

    The whole paragraph can be indented, or just the first
    line.  In this way, multi-paragraph footnotes work like
    multi-paragraph list items.

This paragraph won’t be part of the note, because it
isn’t indented.
`;

const slateAST = [
  {
    type: 'paragraph',
    children: [
      {
        text: 'Here is a footnote reference,',
      },
      {
        type: 'footnote',
        children: [{ text: '' }],
        content: [
          {
            type: 'paragraph',
            children: [
              {
                text: 'Here is the footnote.',
              },
            ],
          },
        ],
      },
      {
        text: '\nanother,',
      },
      {
        type: 'footnote',
        children: [{ text: '' }],
        content: [
          {
            type: 'paragraph',
            children: [
              {
                text: 'Here’s one with multiple blocks.',
              },
            ],
          },
          {
            type: 'paragraph',
            children: [
              {
                text:
                  'Subsequent paragraphs are indented to show that they\nbelong to the previous footnote.',
              },
            ],
          },
          {
            text: '{ some.code }',
          },
          {
            type: 'paragraph',
            children: [
              {
                text:
                  'The whole paragraph can be indented, or just the first\nline.  In this way, multi-paragraph footnotes work like\nmulti-paragraph list items.',
              },
            ],
          },
        ],
      },
      {
        text: ',\nand optionally there are inline\nnotes.',
      },
      {
        type: 'footnote',
        children: [{ text: '' }],
        content: [
          {
            type: 'paragraph',
            children: [
              {
                text:
                  'you can type them inline, which may be easier, since you don’t\nhave to pick an identifier and move down to type the note.',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'This paragraph won’t be part of the note, because it\nisn’t indented.',
      },
    ],
  },
];

const slateASTWithCitations = [
  {
    type: 'paragraph',
    children: [
      {
        text: 'A paragraph with citation ',
      },
      {
        type: 'citation',
        citationItems: [
          {
            id: 'tchak',
          },
        ],
        children: [
          {
            text: '',
          },
        ],
      },
      {
        text: ' and an inline citation ',
      },
      {
        type: 'citation',
        citationItems: [
          {
            id: 'tchak',
            authorOnly: true,
          },
        ],
        children: [
          {
            text: '',
          },
        ],
      },
      {
        text: '.',
      },
    ],
  },
];

const slateASTWithHeadings = [
  {
    type: 'heading-one',
    children: [
      {
        text: 'Heading 1',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text: 'paragraph 1',
      },
    ],
  },
  {
    type: 'heading-two',
    children: [
      {
        text: 'Heading 2',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text: 'paragraph 2',
      },
    ],
  },
];

test('markdown with headings', async (t) => {
  const nodes = parse(
    '# Heading 1\n\nparagraph 1\n\n## Heading 2\n\nparagraph 2'
  );

  t.deepEqual(nodes, slateASTWithHeadings, 'should produce slate AST');
});

test('markdown with footnotes', async (t) => {
  const nodes = parse(mdWithFootnotes);

  t.deepEqual(nodes, slateAST, 'should produce slate AST');
});

test('markdown with citations', async (t) => {
  const markdown = stringify(slateASTWithCitations);

  t.equal(
    markdown,
    'A paragraph with citation [@tchak] and an inline citation @tchak.\n'
  );
});
