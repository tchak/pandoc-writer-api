import { test } from 'tap';

import { build, request } from '../helper';

test('validate user email', async (t) => {
  const app = await build(t);

  let res = await request(app, '/v1/users', 'POST', {
    data: {
      attributes: {
        email: '',
        password: '',
      },
    },
  });
  t.equal(
    res.status,
    400,
    'POST /users without email and password should error with status 400'
  );

  res = await request(app, '/v1/users', 'POST', {
    data: {
      attributes: {
        email: 'toto',
        password: '1234',
      },
    },
  });
  t.equal(
    res.status,
    400,
    'POST /users with invalid email should error with status 400'
  );
  t.deepEqual(
    (res.body as any).errors.email,
    ['Email is not a valid email'],
    'POST /users with invalid email should return error message'
  );

  res = await request(app, '/v1/users', 'POST', {
    data: {
      attributes: {
        email: 'toto@toto.com',
        password: '1234',
      },
    },
  });

  t.equal(
    res.status,
    400,
    'POST /users with pwned password should error with status 400'
  );
  t.deepEqual(
    (res.body as any).errors.password,
    ['Password is pwned'],
    'POST /users with pwned password should return error message'
  );
});
