import { test } from 'tap';

import { build, request } from '../helper';

test('get document', async (t) => {
  const app = await build(t);

  let res = await request(app, '/api/documents', 'POST', {
    data: {
      attributes: {
        title: 'hello',
      },
    },
  });
  t.equal(res.status, 201);
  t.deepEqual((res.body as any).data.attributes.title, 'hello');
  const id = (res.body as any).data.id;

  res = await request(app, '/api/documents');
  t.equal(res.status, 200);
  t.equal((res.body as any).data.length, 1);

  res = await request(app, `/api/documents/${id}`);
  t.equal(res.status, 200);

  res = await request(app, `/api/documents/${id}/versions`);
  t.equal(res.status, 200);
  t.equal((res.body as any).data.length, 1);

  res = await request(app, `/api/documents/${id}`, 'PATCH', {
    data: {
      attributes: {
        title: 'hello2',
      },
    },
  });
  t.equal(res.status, 204);

  res = await request(app, `/api/documents/${id}`);
  t.equal(res.status, 200);
  t.deepEqual((res.body as any).data.attributes.title, 'hello2');

  res = await request(app, `/api/documents/${id}`, 'DELETE');
  t.equal(res.status, 204);

  res = await request(app, '/api/documents');
  t.equal(res.status, 200);
  t.equal((res.body as any).data.length, 0);
});

test('get document with format', async (t) => {
  const app = await build(t);

  let res = await request(app, '/api/documents', 'POST', {
    data: {
      attributes: {
        title: 'hello',
      },
    },
  });
  const id = (res.body as any).data.id;
  const etag = res.headers.etag;
  const data = [
    { type: 'heading_one', children: [{ text: 'Hello' }] },
    {
      type: 'paragraph',
      children: [
        { text: 'Lorem ' },
        { text: 'ipsum', bold: true },
        { text: ' delor' },
      ],
    },
  ];
  const html =
    '<h1 id="hello">Hello</h1>\n<p>Lorem <strong>ipsum</strong> delor</p>\n';
  const markdown = '# Hello\nLorem **ipsum** delor\n';

  await request(
    app,
    `/api/documents/${id}`,
    'PATCH',
    {
      data: {
        attributes: {
          data,
        },
      },
    },
    { ['if-match']: etag }
  );

  res = await request(app, `/api/documents/${id}`, 'GET', undefined, {
    accept: 'text/html',
  });
  t.equal(res.body, html);

  res = await request(app, `/api/documents/${id}.html`, 'GET', undefined, {
    accept: '',
  });
  t.equal(res.body, html);

  res = await request(app, `/api/documents/${id}`, 'GET', undefined, {
    accept: 'text/markdown',
  });
  t.equal(res.body, markdown);

  res = await request(app, `/api/documents/${id}.md`, 'GET', undefined, {
    accept: '',
  });
  t.equal(res.body, markdown);
});

test('patch document', async (t) => {
  const app = await build(t);

  let res = await request(app, '/api/documents', 'POST', {
    data: {
      attributes: {
        title: 'hello',
      },
    },
  });
  const id = (res.body as any).data.id;
  let etag = res.headers.etag;

  let data = [{ type: 'paragraph', children: [{ text: 'hello world' }] }];
  res = await request(
    app,
    `/api/documents/${id}`,
    'PATCH',
    {
      data: {
        attributes: {
          data,
        },
      },
    },
    { ['if-match']: etag }
  );
  t.equal(res.status, 204);
  etag = res.headers.etag;

  data = [{ type: 'paragraph', children: [{ text: 'hello world!' }] }];
  res = await request(
    app,
    `/api/documents/${id}`,
    'PATCH',
    {
      data: {
        attributes: {
          data,
        },
      },
    },
    { ['if-match']: etag }
  );
  t.equal(res.status, 204);

  data = [{ type: 'paragraph', children: [{ text: 'hello' }] }];
  res = await request(
    app,
    `/api/documents/${id}`,
    'PATCH',
    {
      data: {
        attributes: {
          data,
        },
      },
    },
    { ['if-match']: etag }
  );
  t.equal(res.status, 412);

  res = await request(app, `/api/documents/${id}/versions`);
  t.equal(res.status, 200);
  t.equal((res.body as any).data.length, 1);

  const version = (res.body as any).data[0];

  res = await request(app, `/api/documents/${id}?fields[]=data`);
  t.equal(res.status, 200);
  t.deepEqual((res.body as any).data.attributes.data, [
    { type: 'paragraph', children: [{ text: 'hello world!' }] },
  ]);

  res = await request(app, `/api/versions/${version.id}`);
  t.equal(res.status, 200);
});
