import { FastifyInstance, RequestGenericInterface } from 'fastify';
import { sortBy } from 'lodash';

interface GetCitationStylesRequest extends RequestGenericInterface {
  Querystring: {
    order?: string;
  };
}

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.get<GetCitationStylesRequest>('/citation-styles', async function () {
    return {
      data: sortBy(
        [
          {
            type: 'citation-styles',
            id: 'chicago-author-date',
            attributes: {
              value: 'chicago-author-date',
              title: 'Chicago Manual of Style 17th edition (author-date)',
            },
          },
          {
            type: 'citation-styles',
            id: 'modern-language-association',
            attributes: {
              title: 'Modern Language Association 8th edition',
            },
          },
          {
            type: 'citation-styles',
            id: 'oxford-university-press-note',
            attributes: {
              title: 'Oxford University Press (note)',
            },
          },
          {
            type: 'citation-styles',
            id: 'chicago-note-bibliography',
            attributes: {
              title: 'Chicago Manual of Style 17th edition (note)',
            },
          },
        ],
        'attributes.title'
      ),
    };
  });
}
