import { FastifyInstance, RequestGenericInterface } from 'fastify';

import { DocumentVersion } from '../../models';

interface GetVersionRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    fields?: string[];
  };
}

interface DestroyVersionRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
}

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.get<GetVersionRequest>('/versions/:id', async function (request) {
    const {
      params: { id },
      query: { fields },
    } = request;
    const query = DocumentVersion.query().findById(id);
    const version = await query;

    return { data: version.$toJsonApi(fields) };
  });

  fastify.delete<DestroyVersionRequest>('/versions/:id', async function (
    request,
    reply
  ) {
    const {
      params: { id },
    } = request;
    const query = DocumentVersion.query().findById(id);
    await query.del();

    reply.status(204);
  });
}
