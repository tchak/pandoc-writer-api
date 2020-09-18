import { BlockType, parse } from '../lib/unist';
import { User, Document } from '../models';

interface CreateDocumentParams {
  title?: string;
  language?: string;
  data?: BlockType[];
  markdown?: string;
}

export class CreateDocumentCommand {
  #user: User;

  constructor(user: User) {
    this.#user = user;
  }

  async run(params: CreateDocumentParams): Promise<Document> {
    const { markdown, title, language } = params;
    let { data } = params;

    if (markdown) {
      data = parse(markdown);
    }

    const document = await this.#user
      .$relatedQuery<Document>('documents')
      .insertGraphAndFetch({
        title: title || 'Imported Document',
        language: language || 'en',
        meta: {},
        versions: [
          {
            data,
          },
        ],
      });

    return document;
  }
}
