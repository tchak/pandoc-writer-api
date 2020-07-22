import { test } from 'tap';

import { build, request } from '../helper';

test('references api', async (t) => {
  const app = await build(t);

  let res = await request(app, '/api/references', 'POST', {
    data: {
      attributes: {
        data: {
          id: '1',
          type: 'book',
        },
      },
    },
  });
  t.equal(res.status, 201);

  res = await request(app, '/api/references');
  t.equal(res.status, 200);
  t.equal((res.body as any).data.length, 1);
});
