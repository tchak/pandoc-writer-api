import { FastifyInstance, RequestGenericInterface } from 'fastify';

import { searchByURL, searchByIdentifier, Item } from '../../lib/zotero';
import { User, Reference, Document, UserToken } from '../../models';

interface CreateReferenceRequest extends RequestGenericInterface {
  Body: {
    data: {
      attributes: {
        data?: Item;
        url?: string;
        identifier?: string;
      };
      relationships?: {
        documents: {
          data: { id: string }[];
        };
      };
    };
  };
}

interface DestroyReferenceRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
}

interface GetReferencesRequest extends RequestGenericInterface {
  Querystring: {
    order?: string;
    fields?: string[];
    q?: string;
  };
}

interface GetReferenceRequest extends RequestGenericInterface {
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

  fastify.post<CreateReferenceRequest>('/references', async function (
    request,
    reply
  ) {
    const {
      attributes: { data, url, identifier },
      relationships,
    } = request.body.data;
    const user = await User.findByToken(request.user as UserToken);
    let items: Item[] = [];

    if (url) {
      items = await searchByURL(url);
    } else if (identifier) {
      items = await searchByIdentifier(identifier);
    } else {
      items = [data];
    }

    const references = await user
      .$relatedQuery<Reference>('references')
      .insert(items.map((data) => ({ data })));

    if (relationships) {
      const ids = relationships.documents.data.map(({ id }) => id);
      for (const reference of references) {
        await reference.$relatedQuery<Document>('documents').relate(ids);
      }
    }

    reply.status(201);
    return { data: references[0].$toJsonApi() };
  });

  fastify.get<GetReferencesRequest>('/references', async function (request) {
    const {
      query: { order, q, fields },
    } = request;

    const user = await User.findByToken(request.user as UserToken);
    const references = await user
      .$relatedQuery<Reference>('references')
      .modify('kept', false)
      .modify('search', q)
      .modify('order', order);

    return {
      data: references.map((reference) => reference.$toJsonApi(fields)),
    };
  });

  fastify.get<GetReferenceRequest>('/references/:id', async function (request) {
    const user = await User.findByToken(request.user as UserToken);
    const reference = await user
      .$relatedQuery<Reference>('references')
      .modify('kept')
      .findById(request.params.id);

    return { data: reference.$toJsonApi(request.query.fields) };
  });

  fastify.delete<DestroyReferenceRequest>('/references/:id', async function (
    request,
    reply
  ) {
    const user = await User.findByToken(request.user as UserToken);
    const query = user
      .$relatedQuery<Reference>('references')
      .modify('kept')
      .findById(request.params.id);

    await query.del();

    reply.status(204);
  });
}
