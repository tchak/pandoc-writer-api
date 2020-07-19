import { FastifyInstance, RequestGenericInterface } from 'fastify';
import { Record as OrbitRecord, RecordIdentity } from '@orbit/data';
import { uuid } from '@orbit/utils';
import { diff_match_patch as DiffMatchPatch } from 'diff-match-patch';

import Document from '../../models/document';
import Change from '../../models/change';

interface CreateChangeRequest extends RequestGenericInterface {
  Body: {
    data: OrbitRecord;
  };
  Headers: {
    'if-match': string;
  };
}

interface GetChangesRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    fields?: string[];
  };
}

interface GetChangeRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    fields?: string[];
  };
}

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.post<CreateChangeRequest>('/changes', async function (
    request,
    reply
  ) {
    const documentId = (request.body.data.relationships.document
      .data as RecordIdentity).id;
    const patch: string = request.body.data.attributes.patch;
    const etag = request.headers['if-match'];

    try {
      const change = await Document.transaction(async (trx) => {
        const query = Document.query(trx).findById(documentId);
        const document = await query;

        if (document.etag === etag) {
          const dmp = new DiffMatchPatch();
          const [body, results] = dmp.patch_apply(
            dmp.patch_fromText(patch),
            document.body
          );

          if (results.every((result) => result)) {
            const change = await document.$relatedQuery('changes').insert({
              id: uuid(),
              patch,
            });

            await query.patch({ body: body, etag: change.id });

            return change;
          }

          throw new Error('Precondition Failed');
        }
      });

      reply.status(201);
      return { data: change.$toJsonApi() };
    } catch (e) {
      reply.preconditionFailed();
    }
  });

  fastify.get<GetChangeRequest>('/changes/:id', async function (request) {
    const query = Change.query().findById(request.params.id);
    const change = await query;

    return { data: change.$toJsonApi(request.query.fields) };
  });

  fastify.get<GetChangesRequest>('/documents/:id/changes', async function (
    request
  ) {
    const query = Change.query().where({ document_id: request.params.id });
    const changes = await query;

    return {
      data: changes.map((change) => change.$toJsonApi(request.query.fields)),
    };
  });
}
