import { FastifyInstance, RequestGenericInterface } from 'fastify';
import formBody from 'fastify-formbody';
import { verify } from 'argon2';
import { DateTime } from 'luxon';

import { User, UserToken, RefreshToken } from '../models';

interface TokenRequest extends RequestGenericInterface {
  Body: {
    grant_type: 'refresh_token' | 'password';
    username?: string;
    password?: string;
    refresh_token?: string;
  };
}

export default async function (server: FastifyInstance): Promise<void> {
  server.register(async function (server) {
    server.register(formBody);

    server.post<TokenRequest>('/token', async function (request, reply) {
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
          return generateAccessToken(server, user, refreshToken.token);
        }
      } else if (grant_type === 'refresh_token') {
        const user = await findUserByRefreshToken(refresh_token);

        if (user) {
          return generateAccessToken(server, user);
        }
      }

      reply.unauthorized();
    });
  });

  server.delete('/logout', async function (request, reply) {
    const user = await User.findByToken(request.user as UserToken);
    await user.$relatedQuery<RefreshToken>('refreshTokens').del();

    reply.status(204);
  });
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

function generateAccessToken(
  server: FastifyInstance,
  user: User,
  refresh_token?: string
) {
  const access_token = server.jwt.sign(
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
