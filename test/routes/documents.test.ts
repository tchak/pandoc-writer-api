import { test } from 'tap';
import { build, request } from '../helper';

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
