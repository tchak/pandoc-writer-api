import fp from 'fastify-plugin';
import { parse, IParseOptions } from 'qs';

export default fp(async (server, options: IParseOptions) => {
  server.addHook('onRequest', (request, _, done) => {
    const url = request.raw.url.replace(/\?{2,}/, '?');
    const queryExists = url.indexOf('?');
    const query = queryExists > -1 ? url.slice(queryExists + 1) : '';
    request.query = parse(query, options);
    done();
  });
});
