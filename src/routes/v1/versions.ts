import { FastifyInstance, RequestGenericInterface } from 'fastify';

import { User, DocumentVersion, UserToken } from '../../models';
import { renderDocument, accepts } from '../../utils';

interface GetVersionRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    fields?: string[];
  };
}

interface CreateVersionRequest extends RequestGenericInterface {
  Body: {
    data: {
      relationships: {
        document: {
          data: { id: string };
        };
      };
    };
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

  fastify.post<CreateVersionRequest>('/versions', async function (
    request,
    reply
  ) {
    const document = await User.findDocument(
      request.user as UserToken,
      request.body.data.relationships.document.data.id,
      true
    );
    const version = await document
      .$relatedQuery<DocumentVersion>('versions')
      .insertAndFetch({
        data: document.data,
      });

    reply.status(201);
    return { data: version.$toJsonApi() };
  });

  fastify.get<GetVersionRequest>('/versions/:id', async function (
    request,
    reply
  ) {
    const {
      params: { id: idWithFormat },
      query: { fields },
    } = request;
    const [id, format] = idWithFormat.split('.');

    const user = await User.findByToken(request.user as UserToken);
    const version = await DocumentVersion.query()
      .modify('kept')
      .joinRelated('document')
      .where('document.user_id', user.id)
      .whereNull('document.deleted_at')
      .findById(id);

    switch (accepts(request, format)) {
      case 'json':
        reply.header('etag', version.sha);
        reply.type('application/vnd.api+json');
        return { data: version.$toJsonApi(fields) };
      case 'text':
      case 'text/plain':
        return renderDocument(version, 'text', reply);
      case 'markdown':
      case 'md':
        return renderDocument(version, 'md', reply);
      case 'html':
        return renderDocument(version, 'html', reply);
      case 'pdf':
        return renderDocument(version, 'pdf', reply);
      case 'docx':
        return renderDocument(version, 'docx', reply);
      default:
        reply.notAcceptable();
        break;
    }
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
