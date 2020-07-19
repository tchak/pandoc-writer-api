import {
  FastifyInstance,
  RequestGenericInterface,
  FastifyReply,
} from 'fastify';
import { Record as OrbitRecord } from '@orbit/data';
import { uuid } from '@orbit/utils';

import Document from '../../models/document';
import { normalise } from '../../lib/pandiff';

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

interface DestroyDocumentRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
}

const CONTENT_TYPE = [
  'json',
  'html',
  'pdf',
  'docx',
  'application/vnd.api+json',
];

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

  for (const format of ['html', 'docx', 'pdf']) {
    fastify.get<GetDocumentRequest>(
      `/documents/:id/file.${format}`,
      async function (request, reply) {
        const query = Document.query();
        const document = await query.findById(request.params.id);

        return renderDocument(document, format, reply);
      }
    );
  }

  fastify.get<GetDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const query = Document.query();
    const document = await query.findById(request.params.id);

    switch (request.accepts().type(CONTENT_TYPE)) {
      case 'json':
      case 'application/vnd.api+json':
        reply.type('application/vnd.api+json');
        return { data: document.$toJsonApi() };
      case 'html':
        return renderDocument(document, 'html', reply);
      case 'pdf':
        return renderDocument(document, 'pdf', reply);
      case 'docx':
        return renderDocument(document, 'docx', reply);
      default:
        reply.notAcceptable();
        break;
    }
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

  fastify.delete<DestroyDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const query = Document.query();

    await query.findById(request.params.id).del();

    reply.status(204);
  });
}

async function renderDocument(
  document: Document,
  format: string,
  reply: FastifyReply
): Promise<string> {
  switch (format) {
    case 'html':
      reply.type('text/html');
      return normalise(document.body, { to: 'html' });
    case 'docx':
      reply.type(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      return normalise(document.body, { to: 'docx' });
    case 'pdf':
      reply.type('application/pdf');
      return normalise(document.body, { to: 'pdf' });
    case 'markdown':
      reply.type('application/markdown');
      return normalise(document.body);
  }
}
