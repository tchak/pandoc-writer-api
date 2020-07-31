import { test } from 'tap';

import { build, request, login } from '../helper';

test('get references', async (t) => {
  const app = await build(t);
  const token = await login(app);

  let res = await request(
    app,
    '/api/references',
    'POST',
    {
      data: {
        attributes: {
          data: {
            id: '1',
            type: 'book',
          },
        },
      },
    },
    {
      authorization: `Bearer ${token}`,
    }
  );
  t.equal(res.status, 201);

  res = await request(app, '/api/references', undefined, undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(res.status, 200);
  t.equal((res.body as any).data.length, 1);
});
