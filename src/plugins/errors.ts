import fp from 'fastify-plugin';
import { errorHandler } from '@koalition/error-handler';

export default fp(async (server) => {
  server.setErrorHandler(function (error, _, reply) {
    if (error.message === 'PreconditionFailed') {
      reply.preconditionFailed();
    } else {
      const { status, body } = errorHandler(error);

      reply.status(status);
      reply.type('json');
      reply.send(body);
    }
  });
});
