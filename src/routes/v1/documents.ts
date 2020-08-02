import {
  FastifyInstance,
  RequestGenericInterface,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import remark from 'remark';
import footnotes from 'remark-footnotes';

import {
  User,
  Document,
  Reference,
  DocumentVersion,
  UserToken,
} from '../../models';
import { pandoc } from '../../lib/pandoc';
import plugin, { BlockType } from '../../lib/mdast-slate';

interface CreateDocumentBody {
  data: {
    attributes: {
      title: string;
      language?: string;
      data?: BlockType[];
    };
  };
}

interface CreateDocumentRequest extends RequestGenericInterface {
  Body: string | CreateDocumentBody;
  Querystring: {
    title?: string;
    language?: string;
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
    data: {
      attributes: {
        title?: string;
        language?: string;
        data?: BlockType[];
        meta?: Record<string, string>;
      };
    };
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

interface AddDocumentReferencesRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Body: {
    data: { id: string }[];
  };
}

interface RemoveDocumentReferencesRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Body: {
    data: { id: string }[];
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
    q?: string;
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

    let title: string;
    let language: string;
    let markdown: string;
    let data: BlockType[] = [];

    switch (request.headers['content-type']) {
      case 'text/markdown':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        title = request.query.title || 'Imported Document';
        language = request.query.language || 'en';
        markdown = request.body as string;
        break;
      case 'application/vnd.api+json':
        const attributes = (request.body as CreateDocumentBody).data.attributes;
        title = attributes.title;
        language = attributes.language || 'en';
        data = attributes.data || [];
        break;
    }

    if (markdown) {
      data = (
        await remark()
          .use(footnotes, { inlineNotes: true })
          .use(plugin)
          .process(markdown)
      ).data as BlockType[];
    }

    const document = await user
      .$relatedQuery<Document>('documents')
      .insertGraphAndFetch({
        title,
        language,
        versions: [
          {
            data,
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
    const { title, meta, data, language } = request.body.data.attributes;
    const etag = request.headers['if-match'];
    const user = await User.findByToken(request.user as UserToken);

    await Document.transaction(async (trx) => {
      const query = user
        .$relatedQuery<Document>('documents', trx)
        .modify('kept')
        .findById(request.params.id);
      const document = await query.withGraphFetched('versions(last)');

      if (title) {
        await query.patch({ title });
      }
      if (language) {
        await query.patch({ language });
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
      .modify('kept')
      .findById(request.params.id);
    await (await query).$destroy();

    reply.status(204);
  });

  fastify.get<GetDocumentsRequest>('/documents', async function (request) {
    const {
      query: { order = 'created_at' },
    } = request;

    const user = await User.findByToken(request.user as UserToken);
    const query = user
      .$relatedQuery<Document>('documents')
      .modify('kept', false)
      .orderBy(order);
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
      .modify('kept')
      .findById(id)
      .withGraphFetched('versions(last)');
    const document = await query;

    switch (accepts(request, format)) {
      case 'json':
        reply.header('etag', document.sha);
        reply.type('application/vnd.api+json');
        return { data: document.$toJsonApi(fields) };
      case 'text':
      case 'text/plain':
        return renderDocument(document, 'text', reply);
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

  fastify.post<AddDocumentReferencesRequest>(
    '/documents/:id/relationships/references',
    async function (request, reply) {
      const {
        params: { id },
        body: { data },
      } = request;
      const ids = data.map(({ id }) => id);
      const user = await User.findByToken(request.user as UserToken);
      const document = await user
        .$relatedQuery<Document>('documents')
        .modify('kept')
        .findById(id);
      const references = await user
        .$relatedQuery<Reference>('references')
        .modify('kept')
        .whereIn('id', ids);

      await document.$relatedQuery<Reference>('references').relate(references);

      reply.status(204);
    }
  );

  fastify.delete<RemoveDocumentReferencesRequest>(
    '/documents/:id/relationships/references',
    async function (request, reply) {
      const {
        params: { id },
        body: { data },
      } = request;
      const ids = data.map(({ id }) => id);
      const user = await User.findByToken(request.user as UserToken);
      const document = await user
        .$relatedQuery<Document>('documents')
        .modify('kept')
        .findById(id);

      await document
        .$relatedQuery<Reference>('references')
        .modify('kept')
        .whereIn('id', ids)
        .unrelate();

      reply.status(204);
    }
  );

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
        .modify('kept')
        .findById(id);
      const query = document
        .$relatedQuery<DocumentVersion>('versions')
        .orderBy(DocumentVersion.ref('created_at'))
        .modify('kept', false);
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
        .modify('kept')
        .findById(id);
      const query = document
        .$relatedQuery<Reference>('references')
        .orderBy(Reference.ref('created_at'))
        .modify('kept', false)
        .modify('search', request.query.q);
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
  'text/plain',
];

function accepts(
  request: FastifyRequest<GetDocumentRequest>,
  format?: string
): string {
  format = format || request.accepts().type(ACCEPTS);
  if (format === 'application/vnd.api+json') {
    return 'json';
  } else if (format === 'txt') {
    return 'text';
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
    case 'text':
      reply.type('text/plain');
      return document.text;
    case 'html':
      reply.type('text/html');
      return pandoc(document.markdownWithFrontmatter, {
        from: 'markdown+smart+emoji',
        filter: 'pandoc-citeproc',
        to: 'html',
      });
    case 'docx':
      reply.type(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      return pandoc(document.markdownWithFrontmatter, {
        from: 'markdown+smart+emoji',
        filter: 'pandoc-citeproc',
        to: 'docx',
      });
    case 'pdf':
      reply.type('application/pdf');
      return pandoc(document.markdownWithFrontmatter, {
        from: 'markdown+smart',
        filter: 'pandoc-citeproc',
        to: 'pdf',
      });
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
