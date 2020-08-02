import fetch from 'node-fetch';

const SERVER_HOST = process.env.TRANSLATION_SERVER_HOST;
const SERVER_SECRET_KEY = process.env.TRANSLATION_SERVER_SECRET_KEY;

export interface Item {
  id: string;
  type: string;
  title: string;
  abstract: string;
}

export async function searchByURL(url: string): Promise<Item[]> {
  const zoteroItems = await zoteroWeb(url);
  return zoteroExport(zoteroItems, 'csljson');
}

export async function searchByIdentifier(identifier: string): Promise<Item[]> {
  const zoteroItems = await zoteroSearch(identifier);
  return zoteroExport(zoteroItems, 'csljson');
}

export function zoteroWeb(url: string): Promise<unknown> {
  return fetch(`${SERVER_HOST}/web`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVER_SECRET_KEY}`,
      'content-type': 'text/plain',
    },
    body: url,
  }).then((response) => response.json());
}

export function zoteroSearch(identifier: string): Promise<unknown> {
  return fetch(`${SERVER_HOST}/search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVER_SECRET_KEY}`,
      'content-type': 'text/plain',
    },
    body: identifier,
  }).then((response) => response.json());
}

export function zoteroExport(
  zoteroItems: unknown,
  format: string
): Promise<Item[]> {
  return fetch(`${SERVER_HOST}/export?format=${format}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVER_SECRET_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(zoteroItems),
  })
    .then((response) => response.json())
    .then((items) => items as Item[]);
}
