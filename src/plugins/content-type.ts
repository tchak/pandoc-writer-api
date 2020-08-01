import fp from 'fastify-plugin';
import json from 'secure-json-parse';

import { pandoc } from '../lib/pandoc';

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

  server.addContentTypeParser(
    'text/markdown',
    { parseAs: 'string' },
    (_, body: string, done) => {
      done(null, body);
    }
  );

  server.addContentTypeParser(
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    { parseAs: 'buffer' },
    (_, body, done) => {
      pandoc(body, {
        from: 'docx',
        to: 'markdown',
      })
        .then((markdown) => done(null, markdown))
        .catch((error) => done(error));
    }
  );
});
