import { ColumnRef, OrderByDirection, ReferenceFunction } from 'objection';

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
