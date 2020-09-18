import { BlockType } from '../lib/unist';
import { User, Document } from '../models';

interface UpdateDocumentParams {
  id: string;
  etag: string;
  data?: BlockType[];
  attributes?: Partial<Document>;
}

export class UpdateDocumentCommand {
  #user: User;

  constructor(user: User) {
    this.#user = user;
  }

  async run(params: UpdateDocumentParams): Promise<Document> {
    const { id, data, etag, attributes } = params;

    return Document.transaction(async (trx) => {
      const query = this.#user
        .$relatedQuery<Document>('documents', trx)
        .modify('kept')
        .findById(id);

      const document = await query.withGraphFetched('versions(last)');
      await query.patch(attributes);

      if (data) {
        await document.patchDocumentVersion(data, etag);
      }

      return document;
    });
  }
}
