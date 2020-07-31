import AutoLoad from 'fastify-autoload';
import * as path from 'path';
import { FastifyInstance } from 'fastify';
import cors from 'fastify-cors';
import favicon from 'fastify-favicon';
import helmet from 'fastify-helmet';
import accepts from 'fastify-accepts';
import sensible from 'fastify-sensible';
import jwt from 'fastify-jwt';
import auth from 'fastify-auth';

export default async function (
  fastify: FastifyInstance,
  opts: unknown
): Promise<void> {
  // Place here your custom code!
  fastify.register(cors);
  fastify.register(favicon);
  fastify.register(helmet);
  fastify.register(accepts);
  fastify.register(sensible);
  fastify.register(jwt, { secret: process.env.AUTH_SECRET });
  fastify.register(auth);

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: opts,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: opts,
  });
}
