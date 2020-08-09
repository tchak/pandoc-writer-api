import { ColumnRef, OrderByDirection, ReferenceFunction } from 'objection';
import { FastifyReply, FastifyRequest } from 'fastify';

import { Document, DocumentVersion } from './models';
import { pandoc } from './lib/pandoc';

export function pluck(
  obj: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> {
  const res: Record<string, unknown> = {};
  for (const key of keys) {
    if (obj[key] !== undefined) {
      res[key] = obj[key];
    }
  }
  return res;
}

export function mapKeys<T>(
  obj: Record<string, T>,
  callback: (key: string) => string
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [callback(key), value])
  );
}

export function toTsQuery(searchTerms: string): string {
  return (searchTerms || '')
    .replace(/['?\\:&|!<>\(\)]/g, '') // drop disallowed characters
    .trim()
    .split(/\s+/) // split words
    .map((word: string) => `${word}:*`) // enable prefix matching
    .join(' & ');
}

export function orderBy(
  ref: ReferenceFunction,
  order?: 'created-at' | '-created-at' | 'updated-at' | '-updated-at'
): [ColumnRef, OrderByDirection] {
  switch (order) {
    case 'updated-at':
      return [ref('updated_at'), 'ASC'];
    case '-updated-at':
      return [ref('updated_at'), 'DESC'];
    case 'created-at':
      return [ref('created_at'), 'ASC'];
    case '-created-at':
    default:
      return [ref('created_at'), 'DESC'];
  }
}

export async function renderDocument(
  document: Document | DocumentVersion,
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

const ACCEPTS = [
  'json',
  'html',
  'markdown',
  'pdf',
  'docx',
  'application/vnd.api+json',
  'text/plain',
];

export function accepts(request: FastifyRequest, format?: string): string {
  format = format || request.accepts().type(ACCEPTS);
  if (format === 'application/vnd.api+json') {
    return 'json';
  } else if (format === 'txt') {
    return 'text';
  }
  return format;
}
