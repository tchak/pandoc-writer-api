import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope
export default fp(async function (fastify: FastifyInstance) {
  fastify.decorate('someSupport', function () {
    return 'hugs';
  });
});

// Using Typescript you need to extend FastifyInstance
// type declaration with your plugin
declare module 'fastify' {
  export interface FastifyInstance {
    someSupport(): string;
  }
}
