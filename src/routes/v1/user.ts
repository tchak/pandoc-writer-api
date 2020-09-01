import { FastifyInstance, RequestGenericInterface } from 'fastify';
import { hash } from 'argon2';
import { pwnedPassword } from 'hibp';
import { validate } from 'validate.js';

import { User, UserToken } from '../../models';

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

export default async function (server: FastifyInstance): Promise<void> {
  server.post<CreateUserRequest>('/user', async function (request, reply) {
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

  server.get(
    '/user',
    { preHandler: server.auth([async (request) => request.jwtVerify()]) },
    async function (request) {
      const user = await User.findByToken(request.user as UserToken);

      return { data: user.$toJsonApi() };
    }
  );

  server.delete(
    '/user',
    { preHandler: server.auth([async (request) => request.jwtVerify()]) },
    async function (request, reply) {
      const user = await User.findByToken(request.user as UserToken);
      await user.$destroy();

      reply.send(204);
    }
  );
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
