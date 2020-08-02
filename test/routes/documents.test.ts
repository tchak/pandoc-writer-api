import { test } from 'tap';
import { readFileSync } from 'fs';

import { build, request, login } from '../helper';
import docSlateJson from '../files/doc-slate';

test('get document', async (t) => {
  const app = await build(t);
  const token = await login(app);

  let res = await request(
    app,
    '/v1/documents',
    'POST',
    {
      data: {
        attributes: {
          title: 'hello',
        },
      },
    },
    {
      authorization: `Bearer ${token}`,
    }
  );

  t.equal(res.status, 201, 'POST /documents should succeed with status 201');
  t.deepEqual((res.body as any).data.attributes.title, 'hello');
  const id = (res.body as any).data.id;

  res = await request(app, '/v1/documents', undefined, undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(res.status, 200, 'GET /documents should succeed with status 200');
  t.equal((res.body as any).data.length, 1);

  res = await request(app, `/v1/documents/${id}`, undefined, undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(res.status, 200, 'GET /documents/:id should succeed with status 200');

  res = await request(
    app,
    `/v1/documents/${id}/versions`,
    undefined,
    undefined,
    {
      authorization: `Bearer ${token}`,
    }
  );
  t.equal(res.status, 200),
    'GET /documents/:id/versions should succeed with status 200';
  t.equal((res.body as any).data.length, 1);

  res = await request(
    app,
    `/v1/documents/${id}`,
    'PATCH',
    {
      data: {
        attributes: {
          title: 'hello2',
        },
      },
    },
    {
      authorization: `Bearer ${token}`,
    }
  );
  t.equal(
    res.status,
    204,
    'PATCH /documents/:id should succeed with status 204'
  );

  res = await request(app, `/v1/documents/${id}`, undefined, undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(res.status, 200, 'GET /documents/:id should succeed with status 200');
  t.deepEqual((res.body as any).data.attributes.title, 'hello2');

  res = await request(app, `/v1/documents/${id}`, 'DELETE', undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(
    res.status,
    204,
    'DELETE /documents/:id should succeed with status 204'
  );

  res = await request(app, '/v1/documents', undefined, undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(res.status, 200, 'GET /documents should succeed with status 200');
  t.equal((res.body as any).data.length, 0);
});

test('get formatted document', async (t) => {
  const app = await build(t);
  const token = await login(app);

  const data = [
    { type: 'heading-one', children: [{ text: 'Hello' }] },
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
  const markdown = '# Hello\n\nLorem **ipsum** delor\n';
  const text = 'Hello\n\nLorem ipsum delor\n';

  let res = await request(
    app,
    '/v1/documents',
    'POST',
    {
      data: {
        attributes: {
          title: 'hello',
          data,
        },
      },
    },
    {
      authorization: `Bearer ${token}`,
    }
  );
  const id = (res.body as any).data.id;

  res = await request(app, `/v1/documents/${id}`, 'GET', undefined, {
    accept: 'text/html',
    authorization: `Bearer ${token}`,
  });
  t.equal(res.body, html, 'should return html');

  res = await request(app, `/v1/documents/${id}.html`, 'GET', undefined, {
    accept: '',
    authorization: `Bearer ${token}`,
  });
  t.equal(res.body, html, 'should return html');

  res = await request(app, `/v1/documents/${id}`, 'GET', undefined, {
    accept: 'text/markdown',
    authorization: `Bearer ${token}`,
  });
  t.equal(res.body, markdown, 'should return markdown');

  res = await request(app, `/v1/documents/${id}.md`, 'GET', undefined, {
    accept: '',
    authorization: `Bearer ${token}`,
  });
  t.equal(res.body, markdown, 'should return markdown');

  res = await request(app, `/v1/documents/${id}`, 'GET', undefined, {
    accept: 'text/plain',
    authorization: `Bearer ${token}`,
  });
  t.equal(res.body, text, 'should return text');

  res = await request(app, `/v1/documents/${id}.txt`, 'GET', undefined, {
    accept: '',
    authorization: `Bearer ${token}`,
  });
  t.equal(res.body, text, 'should return text');
});

test('patch document', async (t) => {
  const app = await build(t);
  const token = await login(app);

  let res = await request(
    app,
    '/v1/documents',
    'POST',
    {
      data: {
        attributes: {
          title: 'hello',
        },
      },
    },
    {
      authorization: `Bearer ${token}`,
    }
  );
  const id = (res.body as any).data.id;
  let etag = res.headers.etag;

  let data = [{ type: 'paragraph', children: [{ text: 'hello world' }] }];
  res = await request(
    app,
    `/v1/documents/${id}`,
    'PATCH',
    {
      data: {
        attributes: {
          data,
        },
      },
    },
    { ['if-match']: etag, authorization: `Bearer ${token}` }
  );
  t.equal(res.status, 204);
  etag = res.headers.etag;

  data = [{ type: 'paragraph', children: [{ text: 'hello world!' }] }];
  res = await request(
    app,
    `/v1/documents/${id}`,
    'PATCH',
    {
      data: {
        attributes: {
          data,
        },
      },
    },
    { ['if-match']: etag, authorization: `Bearer ${token}` }
  );
  t.equal(res.status, 204);

  data = [{ type: 'paragraph', children: [{ text: 'hello' }] }];
  res = await request(
    app,
    `/v1/documents/${id}`,
    'PATCH',
    {
      data: {
        attributes: {
          data,
        },
      },
    },
    { ['if-match']: etag, authorization: `Bearer ${token}` }
  );
  t.equal(res.status, 412);

  res = await request(
    app,
    `/v1/documents/${id}/versions`,
    undefined,
    undefined,
    {
      authorization: `Bearer ${token}`,
    }
  );
  t.equal(
    res.status,
    200,
    'GET /documents/:id/versions should succeed with status 200'
  );
  t.equal((res.body as any).data.length, 1);

  const version = (res.body as any).data[0];

  res = await request(
    app,
    `/v1/documents/${id}?fields[]=data`,
    undefined,
    undefined,
    {
      authorization: `Bearer ${token}`,
    }
  );
  t.equal(res.status, 200, 'GET /documents/:id should succeed with status 200');
  t.deepEqual((res.body as any).data.attributes.data, [
    { type: 'paragraph', children: [{ text: 'hello world!' }] },
  ]);

  res = await request(app, `/v1/versions/${version.id}`, undefined, undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(res.status, 200, 'GET /versions/:id should succeed with status 200');
});

test('import markdown document', async (t) => {
  const app = await build(t);
  const token = await login(app);

  const md = '# Hello world\n\nLorem ipsum dolor sit amet.';
  const data = [
    { type: 'heading-one', children: [{ text: 'Hello world' }] },
    {
      type: 'paragraph',
      children: [{ text: 'Lorem ipsum dolor sit amet.' }],
    },
  ];

  let res = await request(app, '/v1/documents', 'POST', md, {
    authorization: `Bearer ${token}`,
    'content-type': 'text/markdown',
  });
  t.equal(res.status, 201, 'POST /documents should succeed with status 201');
  const id = (res.body as any).data.id;

  res = await request(
    app,
    `/v1/documents/${id}?fields[]=data`,
    undefined,
    undefined,
    {
      authorization: `Bearer ${token}`,
    }
  );
  t.equal(res.status, 200, 'GET /documents:id should succeed with status 200');
  t.deepEqual(
    (res.body as any).data.attributes.data,
    data,
    'should return Slate AST'
  );
});

test('import docx document', async (t) => {
  const app = await build(t);
  const token = await login(app);

  const docx = readFileSync('./test/files/doc.docx');

  let res = await request(app, '/v1/documents', 'POST', docx, {
    authorization: `Bearer ${token}`,
    'content-type':
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  t.equal(res.status, 201, 'POST /documents should succeed with status 201');
  const id = (res.body as any).data.id;

  res = await request(
    app,
    `/v1/documents/${id}?fields[]=data`,
    undefined,
    undefined,
    {
      authorization: `Bearer ${token}`,
    }
  );
  t.equal(res.status, 200, 'GET /documents:id should succeed with status 200');
  t.deepEqual(
    (res.body as any).data.attributes.data,
    docSlateJson,
    'should return Slate AST'
  );
});
