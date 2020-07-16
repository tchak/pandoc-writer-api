import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import Knex from 'knex';
import knexConfig from '../../knexfile';
import { Model } from 'objection';

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope
export default fp(async function (fastify: FastifyInstance) {
  const knex = Knex(knexConfig.development);
  Model.knex(knex);

  fastify.decorate('knex', knex);
  fastify.addHook('onClose', async () => {
    await knex.destroy();
  });
});

// Using Typescript you need to extend FastifyInstance
// type declaration with your plugin
declare module 'fastify' {
  export interface FastifyInstance {
    knex(): Knex;
  }
}
