export default [
  { type: 'paragraph', children: [{ text: 'Chapter 1' }] },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod\ntempor incididunt ut labore et dolore magna aliqua. Ac orci phasellus\negestas tellus rutrum. A iaculis at erat pellentesque adipiscing commodo\nelit. Ac turpis egestas maecenas pharetra. Tincidunt augue interdum\nvelit euismod in pellentesque. Magnis dis parturient montes nascetur\nridiculus mus mauris vitae ultricies. Vel pretium lectus quam id leo in.\nNibh cras pulvinar mattis nunc sed blandit libero volutpat sed. Ipsum\ndolor sit amet consectetur adipiscing elit duis tristique. Blandit massa\nenim nec dui nunc mattis enim ut. Consequat ac felis donec et. Quam',
      },
      {
        type: 'footnote',
        children: [{ text: '' }],
        content: [
          {
            type: 'paragraph',
            children: [{ text: 'My first ' }, { bold: true, text: 'footnote' }],
          },
        ],
      },
      {
        text:
          '\nvulputate dignissim suspendisse in est. Purus sit amet luctus venenatis\nlectus magna fringilla urna porttitor. In massa tempor nec feugiat nisl.\nEuismod elementum nisi quis eleifend quam adipiscing vitae. Mollis\naliquam ut porttitor leo a diam sollicitudin tempor id. ',
      },
      { bold: true, text: 'Porttitor' },
      { text: '\nlacus luctus accumsan tortor posuere ac.' },
    ],
  },
  { type: 'paragraph', children: [{ text: 'Chapter 2' }] },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'Amet volutpat consequat mauris nunc congue nisi vitae suscipit. Pharetra\ndiam sit amet nisl suscipit adipiscing bibendum. Turpis nunc eget lorem\ndolor sed viverra ipsum. Bibendum est ultricies integer quis auctor elit\nsed ',
      },
      { text: 'vulputate', italic: true },
      {
        text:
          ' mi. Lectus mauris ultrices eros in cursus. Leo in vitae\nturpis massa sed elementum. Mattis molestie a iaculis at erat\npellentesque ',
      },
      { text: 'adipiscing', strikeThrough: true },
      {
        text:
          ' commodo elit. Luctus accumsan tortor posuere\nac ut consequat semper viverra nam. Cum sociis natoque penatibus et\nmagnis. Proin sagittis nisl rhoncus mattis rhoncus. Congue quisque\negestas diam',
      },
      {
        type: 'footnote',
        children: [{ text: '' }],
        content: [
          { type: 'paragraph', children: [{ text: 'Another footnote' }] },
        ],
      },
      {
        text:
          ' in arcu cursus euismod quis viverra. Eget nulla\nfacilisi etiam dignissim. Tincidunt id aliquet risus feugiat in ante.',
      },
    ],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'Blandit libero volutpat sed cras ornare. Donec et odio pellentesque\ndiam. Aliquet lectus proin nibh nisl condimentum id. In iaculis nunc sed\naugue lacus. Praesent tristique magna sit amet. Placerat duis ultricies\nlacus sed. Amet massa vitae tortor condimentum lacinia quis vel. Sed\nrisus pretium quam ',
      },
      { bold: true, text: 'vulputate dignissim suspendisse' },
      {
        text:
          '. Nullam vehicula\nipsum a arcu cursus. Blandit aliquam etiam erat velit scelerisque in.\nDiam quis enim lobortis scelerisque fermentum dui faucibus in. Dictum at\ntempor commodo ullamcorper. Vitae proin sagittis nisl rhoncus mattis.\nNunc pulvinar sapien et ligula ullamcorper malesuada. Tortor id aliquet\nlectus proin nibh nisl. Facilisis leo vel fringilla est ullamcorper eget\nnulla facilisi. Pellentesque pulvinar pellentesque habitant morbi\ntristique senectus et.',
      },
    ],
  },
  { type: 'paragraph', children: [{ text: '' }] },
  { type: 'paragraph', children: [{ text: '' }] },
];
