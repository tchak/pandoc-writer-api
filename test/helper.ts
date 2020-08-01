// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();

// This file contains code that we reuse
// between our tests.
import Fastify, { FastifyInstance, HTTPMethods } from 'fastify';
import fp from 'fastify-plugin';
import { nanoid } from 'nanoid';
import App from '../src/app';

// Fill in this config with all the configurations
// needed for testing the application
function config(): unknown {
  return {};
}

// automatically build and tear down our instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function build(t: any): Promise<FastifyInstance> {
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
  const defaultHeaders = body
    ? {
        accept: 'application/vnd.api+json',
        'content-type': 'application/vnd.api+json',
      }
    : { accept: 'application/vnd.api+json' };
  headers = Object.assign(defaultHeaders, headers);
  const res = await app.inject({
    url,
    method: method || 'GET',
    headers,
    payload: prepareBody(headers, body),
  });

  const isJSON = headers.accept.match(/json/);

  return {
    status: res.statusCode,
    body: res.payload && isJSON ? JSON.parse(res.payload) : res.payload,
    headers: res.headers as Record<string, string>,
  };
}

function prepareBody(
  headers: Record<string, string>,
  body?: unknown
): string | Buffer {
  if (body && headers['content-type'].match(/json/)) {
    return JSON.stringify(body);
  }
  return body as string | Buffer;
}

async function login(app: FastifyInstance, email?: string): Promise<string> {
  const password = nanoid();
  email = email || `${nanoid()}@test.com`;
  await request(app, '/v1/users', 'POST', {
    data: {
      type: 'users',
      attributes: {
        email,
        password,
      },
    },
  });

  const { body } = await request(app, '/v1/token', 'POST', {
    grant_type: 'password',
    username: email,
    password,
  });

  return (body as any).access_token;
}

export { config, build, request, login };
