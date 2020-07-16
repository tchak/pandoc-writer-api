/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// This file contains code that we reuse
// between our tests.
import Fastify, { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import App from '../src/app';

// Fill in this config with all the configurations
// needed for testing the application
function config(): unknown {
  return {};
}

// automatically build and tear down our instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function build(t: any): FastifyInstance {
  const app = Fastify();

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  app.register(fp(App), config());

  // tear down our app after we are done
  t.tearDown(app.close.bind(app));

  return app;
}

export { config, build };
