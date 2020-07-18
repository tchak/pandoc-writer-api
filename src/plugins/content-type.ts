import fp from 'fastify-plugin';
import json from 'secure-json-parse';

export default fp(async (server) => {
  server.addContentTypeParser(
    'application/vnd.api+json',
    { parseAs: 'string' },
    (_, body: string, done) => {
      let parsedBody;
      try {
        parsedBody = json.parse(body);
        done(null, parsedBody);
      } catch (err) {
        err.statusCode = 400;
        done(err, undefined);
      }
    }
  );
});
