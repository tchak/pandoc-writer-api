import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import Knex from 'knex';
import knexConfig from '../../knexfile';
import { Model } from 'objection';

export default fp(async function (server: FastifyInstance) {
  const environment = process.env['NODE_ENV'] || 'development';
  const knex = Knex(knexConfig[environment]);
  Model.knex(knex);

  server.addHook('onClose', async (_, done) => {
    await knex.destroy();
    done();
  });
});
