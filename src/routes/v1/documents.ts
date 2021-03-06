import { FastifyInstance, RequestGenericInterface } from 'fastify';

import {
  User,
  Document,
  Reference,
  DocumentVersion,
  UserToken,
} from '../../models';
import { CreateDocumentCommand } from '../../commands/create-document';
import { UpdateDocumentCommand } from '../../commands/update-document';
import { BlockType } from '../../lib/unist';
import { renderDocument, accepts } from '../../utils';

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
        author?: string;
        language?: string;
        'citation-style'?: string;
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
    order?: string;
  };
}

interface GetDocumentRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    fields?: string[];
    include?: 'references';
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
    order?: string;
    fields?: string[];
  };
}

interface GetDocumentReferencesRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    order?: string;
    fields?: string[];
    q?: string;
  };
}

export default async function (server: FastifyInstance): Promise<void> {
  server.addHook(
    'preHandler',
    server.auth([async (request) => request.jwtVerify()])
  );

  server.post<CreateDocumentRequest>('/documents', async function (
    request,
    reply
  ) {
    const user = await User.findByToken(request.user as UserToken);
    const command = new CreateDocumentCommand(user);

    let document: Document;

    switch (request.headers['content-type']) {
      case 'text/markdown':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        document = await command.run({
          title: request.query.title,
          language: request.query.language,
          markdown: request.body as string,
        });
        break;
      case 'application/vnd.api+json':
        const { data, title, language } = Document.$fromJsonApi(
          (request.body as CreateDocumentBody).data
        );
        document = await command.run({
          title,
          language,
          data: data || [],
        });
        break;
    }

    reply.header('etag', document.sha);
    reply.status(201);
    return { data: document.$toJsonApi() };
  });

  server.patch<UpdateDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const { data, ...attributes } = Document.$fromJsonApi(request.body.data);
    const etag = request.headers['if-match'];
    const user = await User.findByToken(request.user as UserToken);
    const command = new UpdateDocumentCommand(user);
    const document = await command.run({
      id: request.params.id,
      etag,
      data,
      attributes,
    });

    reply.header('etag', document.sha);
    reply.status(204);
  });

  server.delete<DestroyDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const {
      params: { id },
    } = request;

    const document = await User.findDocument(request.user as UserToken, id);
    await document.$destroy();

    reply.status(204);
  });

  server.get<GetDocumentsRequest>('/documents', async function (request) {
    const {
      query: { order },
    } = request;

    const user = await User.findByToken(request.user as UserToken);
    const documents = await user
      .$relatedQuery<Document>('documents')
      .modify('kept', false)
      .modify('order', order);

    return { data: documents.map((document) => document.$toJsonApi()) };
  });

  server.get<GetDocumentRequest>('/documents/:id', async function (
    request,
    reply
  ) {
    const {
      params: { id: idWithFormat },
      query: { fields, include },
    } = request;
    const [id, format] = idWithFormat.split('.');

    const document = await User.findDocument(
      request.user as UserToken,
      id,
      true
    );
    await document.$fetchGraph('references');

    switch (accepts(request, format)) {
      case 'json':
        reply.header('etag', document.sha);
        reply.type('application/vnd.api+json');
        return {
          data: document.$toJsonApi(fields),
          included: include
            ? document.references.map((reference) => reference.$toJsonApi())
            : [],
        };
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

  server.post<AddDocumentReferencesRequest>(
    '/documents/:id/relationships/references',
    async function (request, reply) {
      const {
        params: { id },
        body: { data },
      } = request;
      const user = await User.findByToken(request.user as UserToken);
      const document = await User.findDocument(request.user as UserToken, id);

      const ids = data.map(({ id }) => id);
      const references = await user
        .$relatedQuery<Reference>('references')
        .modify('kept')
        .whereIn('id', ids);

      await document.$relatedQuery<Reference>('references').relate(references);

      reply.status(204);
    }
  );

  server.delete<RemoveDocumentReferencesRequest>(
    '/documents/:id/relationships/references',
    async function (request, reply) {
      const {
        params: { id },
        body: { data },
      } = request;
      const document = await User.findDocument(request.user as UserToken, id);

      const ids = data.map(({ id }) => id);
      await document
        .$relatedQuery<Reference>('references')
        .modify('kept')
        .whereIn('id', ids)
        .unrelate();

      reply.status(204);
    }
  );

  server.get<GetDocumentVersionsRequest>(
    '/documents/:id/versions',
    async function (request) {
      const {
        params: { id },
        query: { fields, order },
      } = request;

      const document = await User.findDocument(request.user as UserToken, id);

      const versions = await document
        .$relatedQuery<DocumentVersion>('versions')
        .modify('kept', false)
        .modify('order', order);

      return {
        data: versions.map((version) => version.$toJsonApi(fields)),
      };
    }
  );

  server.get<GetDocumentReferencesRequest>(
    '/documents/:id/references',
    async function (request) {
      const {
        params: { id },
        query: { fields, order, q },
      } = request;

      const document = await User.findDocument(request.user as UserToken, id);

      const references = await document
        .$relatedQuery<Reference>('references')
        .modify('kept', false)
        .modify('order', order)
        .modify('search', q);

      return {
        data: references.map((reference) => reference.$toJsonApi(fields)),
      };
    }
  );
}
