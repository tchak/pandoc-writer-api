import fetch from 'node-fetch';

export interface Item {
  id: string;
  type: string;
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
  return fetch('https://zotero-translation-server.herokuapp.com/web', {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
    },
    body: url,
  }).then((response) => response.json());
}

export function zoteroSearch(identifier: string): Promise<unknown> {
  return fetch('https://zotero-translation-server.herokuapp.com/search', {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
    },
    body: identifier,
  }).then((response) => response.json());
}

export function zoteroExport(
  zoteroItems: unknown,
  format: string
): Promise<Item[]> {
  return fetch(
    `https://zotero-translation-server.herokuapp.com/export?format=${format}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(zoteroItems),
    }
  )
    .then((response) => response.json())
    .then((items) => items as Item[]);
}
