import { FastifyInstance, RequestGenericInterface } from 'fastify';
import { Record as OrbitRecord } from '@orbit/data';
import { uuid } from '@orbit/utils';

import Document from '../../models/document';
import Change from '../../models/change';

interface CreateDocumentRequest extends RequestGenericInterface {
  Body: {
    data: OrbitRecord;
  };
}

interface UpdateDocumentRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Body: {
    data: OrbitRecord;
  };
}

interface GetDocumentRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
}

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.post<CreateDocumentRequest>('/documents', async function (
    request,
    reply
  ) {
    const document = await Document.query().insert({
      id: uuid(),
      title: request.body.data.attributes.title,
      body: '',
      etag: uuid(),
    });

    reply.status(201);
    return { data: document.$toJsonApi() };
  });

  fastify.get('/documents', async function (request) {
    const query = Document.query();
    const documents = await query;

    return { data: documents.map((document) => document.$toJsonApi()) };
  });

  fastify.get<GetDocumentRequest>('/documents/:id', async function (request) {
    const query = Document.query();
    const document = await query.findById(request.params.id);

    return { data: document.$toJsonApi() };
  });

  fastify.patch<UpdateDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const query = Document.query();

    await query
      .findById(request.params.id)
      .patch({ title: request.body.data.attributes.title });

    reply.status(204);
  });

  fastify.delete<GetDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const query = Document.query();

    await query.findById(request.params.id).del();

    reply.status(204);
  });
}
