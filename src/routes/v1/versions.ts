import { FastifyInstance, RequestGenericInterface } from 'fastify';

import { User, Document, DocumentVersion, UserToken } from '../../models';

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
  fastify.addHook(
    'preHandler',
    fastify.auth([async (request) => request.jwtVerify()])
  );

  fastify.get<GetVersionRequest>('/versions/:id', async function (request) {
    const {
      params: { id },
      query: { fields },
    } = request;
    const user = await User.findByToken(request.user as UserToken);
    const query = DocumentVersion.query()
      .modify('kept')
      .joinRelated('document')
      .where('document.user_id', user.id)
      .whereNull('document.deleted_at')
      .findById(id);

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
    const user = await User.findByToken(request.user as UserToken);
    const query = DocumentVersion.query()
      .modify('kept')
      .joinRelated('document')
      .where('document.user_id', user.id)
      .whereNull('document.deleted_at')
      .findById(id);

    await (await query).$destroy();

    reply.status(204);
  });
}
