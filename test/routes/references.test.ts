import { test } from 'tap';

import { build, request, login } from '../helper';

test('get references', async (t) => {
  const app = await build(t);
  const token = await login(app);

  let res = await request(
    app,
    '/v1/references',
    'POST',
    {
      data: {
        attributes: {
          data: {
            id: '1',
            type: 'book',
            title: 'Gender in Post-9/11 American Apocalyptic TV',
          },
        },
      },
    },
    {
      authorization: `Bearer ${token}`,
    }
  );
  t.equal(res.status, 201, 'POST /references should succeed with status 201');

  res = await request(app, '/v1/references', undefined, undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(res.status, 200, 'GET /references should succeed with status 200');
  t.equal(
    (res.body as any).data.length,
    1,
    'GET /references should return 1 result'
  );

  res = await request(app, '/v1/references?q=french', undefined, undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(
    res.status,
    200,
    'GET /references?q=french should succeed with status 200'
  );
  t.equal(
    (res.body as any).data.length,
    0,
    'GET /references?q=french should return no results'
  );

  res = await request(app, '/v1/references?q=american', undefined, undefined, {
    authorization: `Bearer ${token}`,
  });
  t.equal(
    res.status,
    200,
    'GET /references?q=american should succeed with status 200'
  );
  t.equal(
    (res.body as any).data.length,
    1,
    'GET /references?q=american should return 1 result'
  );
});
