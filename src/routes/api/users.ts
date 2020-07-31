import { FastifyInstance, RequestGenericInterface } from 'fastify';
import { Record as OrbitRecord } from '@orbit/data';
import { verify, hash } from 'argon2';
import { pwnedPassword } from 'hibp';
import { validate } from 'validate.js';

import { User } from '../../models';

interface CreateUserRequest extends RequestGenericInterface {
  Body: {
    data: OrbitRecord;
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
      const user = await User.query().insert({
        email: email.toLowerCase(),
        passwordHash: await hash(password),
      });

      reply.status(201);
      return { data: user.$toJsonApi() };
    }

    reply.forbidden();
  });

  fastify.post<TokenRequest>('/token', async function (request, reply) {
    const { grant_type, username, password, refresh_token } = request.body;

    let user: User | boolean;
    switch (grant_type) {
      case 'password':
        user = await findUserWithPassword(username, password);
        break;
      case 'refresh_token':
        user = await findUserByRefreshToken(refresh_token);
        break;
    }

    if (user) {
      const day = 60 * 60 * 24;
      const expiresIn = day * 7;
      const access_token = fastify.jwt.sign(
        { email: user.email },
        { expiresIn, subject: user.id }
      );
      const refresh_token = 'tGzv3JOkF0XG5Qx2TlKWIA';

      return {
        access_token,
        token_type: 'bearer',
        expires_in: expiresIn,
        refresh_token,
      };
    }

    reply.unauthorized();
  });
}

async function findUserWithPassword(
  username: string,
  password: string
): Promise<User | false> {
  const user = await User.query()
    .select('id', 'email', 'password_hash')
    .findOne('email', username.toLowerCase());
  if (user && (await verifyPassword(user.passwordHash, password))) {
    return user;
  }
  return false;
}

async function findUserByRefreshToken(
  refreshToken: string
): Promise<User | false> {
  return false;
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
