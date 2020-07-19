import { test } from 'tap';
import { diff_match_patch as DiffMatchPatch } from 'diff-match-patch';

import { build, request } from '../helper';

function diff(text1: string, text2: string) {
  const dmp = new DiffMatchPatch();
  const patch = dmp.patch_make(text1, text2);
  return dmp.patch_toText(patch);
}

test('documents api', async (t) => {
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

  res = await request(app, `/api/documents/${id}/changes`);
  t.equal(res.status, 200);
  t.equal((res.body as any).data.length, 0);

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

test('documents formats', async (t) => {
  const app = await build(t);

  let res = await request(app, '/api/documents', 'POST', {
    data: {
      attributes: {
        title: 'hello',
      },
    },
  });
  const id = (res.body as any).data.id;
  const etag = (res.body as any).data.attributes.etag;
  const patch = diff('', '# Hello\nLorem **ipsum** delor');

  await request(
    app,
    '/api/changes',
    'POST',
    {
      data: {
        attributes: {
          patch,
        },
        relationships: {
          document: {
            data: { id },
          },
        },
      },
    },
    { ['if-match']: etag }
  );

  res = await request(app, `/api/documents/${id}`, 'GET', undefined, {
    accept: 'text/html',
  });

  t.equal(
    res.body,
    '<h1 id="hello">Hello</h1>\n<p>Lorem <strong>ipsum</strong> delor</p>\n'
  );

  res = await request(app, `/api/documents/${id}/file.html`, 'GET', undefined, {
    accept: '',
  });

  t.equal(
    res.body,
    '<h1 id="hello">Hello</h1>\n<p>Lorem <strong>ipsum</strong> delor</p>\n'
  );
});
