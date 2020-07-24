import { test } from 'tap';
import unified from 'unified';
import markdown from 'remark-parse';
import footnotes from 'remark-footnotes';

import plugin from '../../src/lib/mdast-slate';

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
        children: [
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
        children: [
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
        children: [
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
        text: '',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text: '',
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

test('markdown with footnotes', (t) => {
  unified()
    .use(markdown)
    .use(footnotes, { inlineNotes: true })
    .use(plugin)
    .process(mdWithFootnotes, function (err, file) {
      if (err) throw err;
      t.deepEqual(file.data, slateAST);
      t.done();
    });
});
