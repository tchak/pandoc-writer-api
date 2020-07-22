import { FastifyInstance, RequestGenericInterface } from 'fastify';
import { Record as OrbitRecord } from '@orbit/data';
import { uuid } from '@orbit/utils';

import { searchByURL, searchByIdentifier, Item } from '../../lib/zotero';
import Reference from '../../models/reference';

interface CreateReferenceRequest extends RequestGenericInterface {
  Body: {
    data: OrbitRecord;
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

interface DestroyReferenceRequest extends RequestGenericInterface {
  Params: {
    id: string;
  };
}

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.post<CreateReferenceRequest>('/references', async function (
    request,
    reply
  ) {
    const { data } = request.body.data.attributes;
    const reference = await Reference.query().insert({
      id: uuid(),
      data,
    });

    reply.status(201);
    return { data: reference.$toJsonApi() };
  });

  fastify.post<CrawlReferenceRequest>('/references/crawl', async function (
    request,
    reply
  ) {
    const { url, identifier } = request.body;
    let items: Item[];

    if (url) {
      items = await searchByURL(url);
    } else if (identifier) {
      items = await searchByIdentifier(identifier);
    }

    const references = await Reference.query().insert(
      items.map((data) => ({ id: uuid(), data }))
    );

    reply.status(201);
    return { data: references.map((reference) => reference.$toJsonApi()) };
  });

  fastify.get<GetReferencesRequest>('/references', async function (request) {
    const query = Reference.query();
    const references = await query;

    return {
      data: references.map((reference) =>
        reference.$toJsonApi(request.query.fields)
      ),
    };
  });

  fastify.get<GetReferenceRequest>('/references/:id', async function (request) {
    const query = Reference.query();
    const reference = await query.findById(request.params.id);

    return { data: reference.$toJsonApi(request.query.fields) };
  });

  fastify.delete<DestroyReferenceRequest>('/references/:id', async function (
    request,
    reply
  ) {
    const query = Reference.query();
    await query.findById(request.params.id).del();

    reply.status(204);
  });
}
