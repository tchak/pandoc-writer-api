import { FastifyInstance, RequestGenericInterface } from 'fastify';
import { verify, hash } from 'argon2';
import { pwnedPassword } from 'hibp';
import { validate } from 'validate.js';
import { DateTime } from 'luxon';

import { User, UserToken, RefreshToken } from '../../models';

interface CreateUserRequest extends RequestGenericInterface {
  Body: {
    data: {
      attributes: {
        email: string;
        password: string;
        code: string;
      };
    };
  };
}

interface TokenRequest extends RequestGenericInterface {
  Body: {
    grant_type: 'refresh_token' | 'password';
    username?: string;
    password?: string;
    refresh_token?: string;
  };
}

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.post<CreateUserRequest>('/users', async function (request, reply) {
    const { email, password, code } = request.body.data.attributes;

    const errors = validate(
      { email, password },
      {
        email: {
          email: true,
          presence: true,
        },
        password: {
          presence: true,
        },
      }
    );

    if (errors) {
      reply.status(400);
      return { errors };
    } else if (await isBadPassword(password)) {
      reply.status(400);
      return { errors: { password: ['Password is pwned'] } };
    } else if (await acceptUserWithCode(code)) {
      const user = await User.query()
        .insert({
          email: email.toLowerCase(),
          passwordHash: await hash(password),
        })
        .returning('*');

      reply.status(201);
      return { data: user.$toJsonApi() };
    }

    reply.forbidden();
  });

  fastify.post<TokenRequest>('/token', async function (request, reply) {
    const { grant_type, username, password, refresh_token } = request.body;

    if (grant_type === 'password') {
      const user = await findUserWithPassword(username, password);

      if (user) {
        const refreshToken = await user
          .$relatedQuery<RefreshToken>('refreshTokens')
          .insert({
            userAgent: request.headers['user-agent'],
          })
          .returning('*');
        return generateAccessToken(fastify, user, refreshToken.token);
      }
    } else if (grant_type === 'refresh_token') {
      const user = await findUserByRefreshToken(refresh_token);

      if (user) {
        return generateAccessToken(fastify, user);
      }
    }

    reply.unauthorized();
  });

  fastify.delete('/logout', async function (request, reply) {
    const user = await User.findByToken(request.user as UserToken);
    await user.$relatedQuery<RefreshToken>('refreshTokens').del();

    reply.status(204);
  });

  fastify.get(
    '/user',
    { preHandler: fastify.auth([async (request) => request.jwtVerify()]) },
    async function (request) {
      const user = await User.findByToken(request.user as UserToken);

      return { data: user.$toJsonApi() };
    }
  );

  fastify.delete(
    '/user',
    { preHandler: fastify.auth([async (request) => request.jwtVerify()]) },
    async function (request, reply) {
      const user = await User.findByToken(request.user as UserToken);
      await user.$destroy();

      reply.send(204);
    }
  );
}

async function findUserWithPassword(
  username: string,
  password: string
): Promise<User | false> {
  const user = await User.query()
    .select('id', 'email', 'password_hash')
    .findOne(User.ref('email'), username.toLowerCase());
  if (user && (await verifyPassword(user.passwordHash, password))) {
    return user;
  }
  return false;
}

async function findUserByRefreshToken(
  refreshToken: string
): Promise<User | false> {
  const token = await RefreshToken.query()
    .throwIfNotFound()
    .where(
      RefreshToken.ref('created_at'),
      '>',
      DateTime.utc().minus({ year: 1 }).toJSDate()
    )
    .withGraphFetched('user')
    .findOne(RefreshToken.ref('token'), refreshToken);

  return token && token.user;
}

async function verifyPassword(hash: string, password: string) {
  try {
    if (await verify(hash, password)) {
      return true;
    } else {
      return false;
    }
  } catch {
    return false;
  }
}

async function acceptUserWithCode(code: string): Promise<boolean> {
  return true;
}

async function isBadPassword(password: string): Promise<boolean> {
  try {
    const n = await pwnedPassword(password);
    return n !== 0;
  } catch {
    return true;
  }
}

function generateAccessToken(
  fastify: FastifyInstance,
  user: User,
  refresh_token?: string
) {
  const access_token = fastify.jwt.sign(
    { email: user.email },
    { subject: user.id }
  );

  if (refresh_token) {
    return {
      access_token,
      token_type: 'bearer',
      refresh_token,
    };
  }

  return {
    access_token,
    token_type: 'bearer',
  };
}
