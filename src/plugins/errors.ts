import fp from 'fastify-plugin';
import { errorHandler } from '@koalition/error-handler';
import { isHttpError } from 'http-errors';

export default fp(async (server) => {
  server.setErrorHandler(function (error, _, reply) {
    if (error.message === 'PreconditionFailed') {
      reply.preconditionFailed();
    } else if (isHttpError(error)) {
      reply.status(error.statusCode);
      reply.type('json');
      reply.send({
        type: error.message,
      });
    } else {
      const { status, body } = errorHandler(error);

      reply.status(status);
      reply.type('json');
      reply.send(body);
    }
  });
});
