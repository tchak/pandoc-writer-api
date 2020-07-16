import { FastifyInstance } from 'fastify';

module.exports = async function (fastify: FastifyInstance): Promise<void> {
  fastify.get('/', async function (request, reply) {
    return { root: true };
  });
};
