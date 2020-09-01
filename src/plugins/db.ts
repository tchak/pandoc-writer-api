import fp from 'fastify-plugin';
import Knex from 'knex';
import { Model } from 'objection';

import knexConfig from '../../knexfile';

export default fp(async (server) => {
  const environment = process.env['NODE_ENV'] || 'development';
  const knex = Knex(knexConfig[environment]);
  Model.knex(knex);

  server.addHook('onClose', async (_, done) => {
    await knex.destroy();
    done();
  });
});
