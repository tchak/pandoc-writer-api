import { test } from 'tap';
import { build, request } from '../helper';
import { diff_match_patch as DiffMatchPatch } from 'diff-match-patch';

function diff(text1: string, text2: string) {
  const dmp = new DiffMatchPatch();
  const patch = dmp.patch_make(text1, text2);
  return dmp.patch_toText(patch);
}

test('changes api', async (t) => {
  const app = await build(t);

  let res = await request(app, '/api/documents', 'POST', {
    data: {
      attributes: {
        title: 'hello',
      },
    },
  });
  const id = (res.body as any).data.id;
  let etag = (res.body as any).data.attributes.etag;

  let patch = diff('', 'hello');
  res = await request(
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
  t.equal(res.status, 201);
  etag = (res.body as any).data.id;

  patch = diff('hello', 'helto');
  res = await request(
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
  t.equal(res.status, 201);

  patch = diff('hello', 'helto2');
  res = await request(
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
  t.equal(res.status, 412);

  res = await request(app, `/api/documents/${id}/changes`);
  t.equal(res.status, 200);
  t.equal((res.body as any).data.length, 2);

  res = await request(app, `/api/documents/${id}`);
  t.equal(res.status, 200);
  t.equal((res.body as any).data.attributes.body, 'helto');

  res = await request(app, `/api/changes/${etag}`);
  t.equal(res.status, 200);
});
