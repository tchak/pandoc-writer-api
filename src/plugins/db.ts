import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import Knex from 'knex';
import knexConfig from '../../knexfile';
import { Model } from 'objection';

const env = process.env['NODE_ENV'] || 'development';

// the use of fastify-plugin is required to be able
// to export the decorators to the outer scope
export default fp(async function (fastify: FastifyInstance) {
  const knex = Knex(knexConfig[env]);
  Model.knex(knex);

  fastify.addHook('onClose', async (_, done) => {
    await knex.destroy();
    done();
  });
});
