import {
  FastifyInstance,
  RequestGenericInterface,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import { Record as OrbitRecord } from '@orbit/data';

import {
  User,
  Document,
  Reference,
  DocumentVersion,
  UserToken,
} from '../../models';
import { pandoc } from '../../lib/pandoc';
import { BlockType } from '../../lib/mdast-slate';

interface CreateDocumentRequest extends RequestGenericInterface {
  Body: {
    data: OrbitRecord;
  };
}

interface UpdateDocumentRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Headers: {
    'if-match': string;
  };
  Body: {
    data: OrbitRecord;
  };
}

interface DestroyDocumentRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
}

interface GetDocumentsRequest extends RequestGenericInterface {
  Querystring: {
    order?: 'created_at' | 'updated_at';
    filter?: string[];
  };
}

interface GetDocumentRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    fields?: string[];
  };
}

interface GetDocumentVersionsRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    fields?: string[];
  };
}

interface GetDocumentReferencesRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    fields?: string[];
  };
}

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.addHook(
    'preHandler',
    fastify.auth([async (request) => request.jwtVerify()])
  );

  fastify.post<CreateDocumentRequest>('/documents', async function (
    request,
    reply
  ) {
    const user = await User.findByToken(request.user as UserToken);
    const document = await user
      .$relatedQuery<Document>('documents')
      .insertGraphAndFetch({
        title: request.body.data.attributes.title,
        versions: [
          {
            data: [],
          },
        ],
      });

    reply.header('etag', document.sha);
    reply.status(201);
    return { data: document.$toJsonApi() };
  });

  fastify.patch<UpdateDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const { title, meta, data } = request.body.data.attributes as {
      title: string;
      meta: Record<string, string>;
      data: BlockType[];
    };
    const etag = request.headers['if-match'];
    const user = await User.findByToken(request.user as UserToken);

    await Document.transaction(async (trx) => {
      const query = user
        .$relatedQuery<Document>('documents')
        .throwIfNotFound()
        .findById(request.params.id);
      const document = await query.withGraphFetched('versions(last)');

      if (title) {
        await query.patch({ title });
      }

      if (meta) {
        await query.patch({
          meta: mapKeys(meta, (key) => `meta:${key}`),
        });
      }

      if (data) {
        await document.patchDocumentVersion(data, etag);
      }

      reply.header('etag', document.sha);
      reply.status(204);
    });
  });

  fastify.delete<DestroyDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const user = await User.findByToken(request.user as UserToken);
    const query = user
      .$relatedQuery<Document>('documents')
      .throwIfNotFound()
      .findById(request.params.id);
    await query.del();

    reply.status(204);
  });

  fastify.get<GetDocumentsRequest>('/documents', async function (request) {
    const {
      query: { order = 'created_at' },
    } = request;

    const user = await User.findByToken(request.user as UserToken);
    const query = user.$relatedQuery<Document>('documents').orderBy(order);
    const documents = await query;

    return { data: documents.map((document) => document.$toJsonApi()) };
  });

  fastify.get<GetDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const {
      params: { id: idWithFormat },
      query: { fields },
    } = request;
    const [id, format] = idWithFormat.split('.');

    const user = await User.findByToken(request.user as UserToken);
    const query = user
      .$relatedQuery<Document>('documents')
      .throwIfNotFound()
      .findById(id)
      .withGraphFetched('versions(last)');
    const document = await query;

    switch (accepts(request, format)) {
      case 'json':
        reply.header('etag', document.sha);
        reply.type('application/vnd.api+json');
        return { data: document.$toJsonApi(fields) };
      case 'markdown':
      case 'md':
        return renderDocument(document, 'md', reply);
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

  fastify.get<GetDocumentVersionsRequest>(
    '/documents/:id/versions',
    async function (request) {
      const {
        params: { id },
        query: { fields },
      } = request;

      const user = await User.findByToken(request.user as UserToken);
      const document = await user
        .$relatedQuery<Document>('documents')
        .throwIfNotFound()
        .findById(id);
      const query = document.$relatedQuery<DocumentVersion>('versions');
      const versions = await query;

      return {
        data: versions.map((version) => version.$toJsonApi(fields)),
      };
    }
  );

  fastify.get<GetDocumentReferencesRequest>(
    '/documents/:id/references',
    async function (request) {
      const {
        params: { id },
        query: { fields },
      } = request;

      const user = await User.findByToken(request.user as UserToken);
      const document = await user
        .$relatedQuery<Document>('documents')
        .throwIfNotFound()
        .findById(id);
      const query = document.$relatedQuery<Reference>('references');
      const references = await query;

      return {
        data: references.map((reference) => reference.$toJsonApi(fields)),
      };
    }
  );
}

const ACCEPTS = [
  'json',
  'html',
  'markdown',
  'pdf',
  'docx',
  'application/vnd.api+json',
];

function accepts(
  request: FastifyRequest<GetDocumentRequest>,
  format?: string
): string {
  format = format || request.accepts().type(ACCEPTS);
  if (format === 'application/vnd.api+json') {
    return 'json';
  }
  return format;
}

async function renderDocument(
  document: Document,
  format: string,
  reply: FastifyReply
): Promise<string> {
  switch (format) {
    case 'md':
      reply.type('text/markdown');
      return document.markdown;
    case 'html':
      reply.type('text/html');
      return pandoc(document.markdown, { from: 'markdown+smart', to: 'html' });
    case 'docx':
      reply.type(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      return pandoc(document.markdown, { from: 'markdown+smart', to: 'docx' });
    case 'pdf':
      reply.type('application/pdf');
      return pandoc(document.markdown, { from: 'markdown+smart', to: 'pdf' });
  }
}

function mapKeys<T>(
  obj: Record<string, T>,
  callback: (key: string) => string
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [callback(key), value])
  );
}
