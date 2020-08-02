import { FastifyInstance, RequestGenericInterface } from 'fastify';

import { searchByURL, searchByIdentifier, Item } from '../../lib/zotero';
import { User, Reference, UserToken } from '../../models';

interface CreateReferenceRequest extends RequestGenericInterface {
  Body: {
    data: {
      attributes: {
        data: Item;
      };
    };
  };
}

interface DestroyReferenceRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
}

interface CrawlReferenceRequest extends RequestGenericInterface {
  Body: {
    url: string;
    identifier: string;
  };
}

interface GetReferencesRequest extends RequestGenericInterface {
  Querystring: {
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
    const { data } = request.body.data.attributes;
    const user = await User.findByToken(request.user as UserToken);
    const reference = await user.$relatedQuery<Reference>('references').insert({
      data,
    });

    reply.status(201);
    return { data: reference.$toJsonApi() };
  });

  fastify.post<CrawlReferenceRequest>('/references/crawl', async function (
    request,
    reply
  ) {
    const user = await User.findByToken(request.user as UserToken);
    const { url, identifier } = request.body;
    let items: Item[];

    if (url) {
      items = await searchByURL(url);
    } else if (identifier) {
      items = await searchByIdentifier(identifier);
    }

    const references = await user
      .$relatedQuery<Reference>('references')
      .insert(items.map((data) => ({ data })));

    reply.status(201);
    return { ids: references.map(({ id }) => id) };
  });

  fastify.get<GetReferencesRequest>('/references', async function (request) {
    const user = await User.findByToken(request.user as UserToken);
    const query = user
      .$relatedQuery<Reference>('references')
      .modify('kept', false)
      .modify('search', request.query.q);

    const references = await query;

    return {
      data: references.map((reference) =>
        reference.$toJsonApi(request.query.fields)
      ),
    };
  });

  fastify.get<GetReferenceRequest>('/references/:id', async function (request) {
    const user = await User.findByToken(request.user as UserToken);
    const query = user
      .$relatedQuery<Reference>('references')
      .modify('kept')
      .findById(request.params.id);

    const reference = await query;

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

    await (await query).$destroy();

    reply.status(204);
  });
}
