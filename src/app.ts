import AutoLoad from 'fastify-autoload';
import * as path from 'path';
import { FastifyInstance } from 'fastify';
import cors from 'fastify-cors';
import helmet from 'fastify-helmet';

export default async function (
  fastify: FastifyInstance,
  opts: unknown
): Promise<void> {
  // Place here your custom code!
  fastify.register(cors);
  fastify.register(helmet);

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
