import fp from 'fastify-plugin';
import Sentry from '@sentry/node';

export default fp(async (server) => {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env['NODE_ENV'] || 'development';

  if (dsn && environment === 'production') {
    Sentry.init({
      dsn,
      environment,
    });

    server.addHook('onError', (request, _, error, done) => {
      Sentry.withScope((scope) => {
        scope.addEventProcessor((event) => {
          return Sentry.Handlers.parseRequest(event, request.raw);
        });
        Sentry.captureException(error);
      });
      done();
    });
  }
});
