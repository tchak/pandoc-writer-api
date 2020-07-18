/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
// This file contains code that we reuse
// between our tests.
import Fastify, { FastifyInstance, HTTPMethods } from 'fastify';
import fp from 'fastify-plugin';
import cleaner from 'knex-cleaner';
import Knex from 'knex';
import knexConfig from '../knexfile';
import App from '../src/app';

async function cleanDB(): Promise<void> {
  const knex = Knex(knexConfig.test);
  await cleaner.clean(knex);
  await knex.destroy();
}

// Fill in this config with all the configurations
// needed for testing the application
function config(): unknown {
  return {};
}

// automatically build and tear down our instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function build(t: any): Promise<FastifyInstance> {
  await cleanDB();

  const app = Fastify();

  // fastify-plugin ensures that all decorators
  // are exposed for testing purposes, this is
  // different from the production setup
  app.register(fp(App), config());

  t.tearDown(() => app.close());

  return app;
}

interface TestResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

async function request(
  app: FastifyInstance,
  url: string,
  method?: HTTPMethods,
  body?: unknown,
  headers?: Record<string, string>
): Promise<TestResponse> {
  const res = await app.inject({
    url,
    method: method || 'GET',
    headers: Object.assign(
      body
        ? {
            accept: 'application/vnd.api+json',
            'content-type': 'application/vnd.api+json',
          }
        : { accept: 'application/vnd.api+json' },
      headers
    ),
    payload: body ? JSON.stringify(body) : undefined,
  });

  return {
    status: res.statusCode,
    body: res.payload ? JSON.parse(res.payload) : undefined,
    headers: res.headers as Record<string, string>,
  };
}

export { config, build, request };
