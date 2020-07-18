import {
  Model,
  RelationMappings,
  snakeCaseMappers,
  ColumnNameMappers,
} from 'objection';
import { Record as OrbitRecord } from '@orbit/data';

import Document from './document';

export default class Change extends Model {
  static get tableName(): string {
    return 'changes';
  }

  static get columnNameMappers(): ColumnNameMappers {
    return snakeCaseMappers();
  }

  static get relationMappings(): RelationMappings {
    return {
      document: {
        relation: Model.HasOneRelation,
        modelClass: Document,
        join: {
          from: 'changes.document_id',
          to: 'documents.id',
        },
      },
    };
  }

  static jsonSchema = {
    type: 'object',
    required: ['patch'],

    properties: {
      id: { type: 'string' },
      documentId: { type: 'string' },
      patch: { type: 'string' },
      createdAt: { type: 'string' },
    },
  };

  static get virtualAttributes(): string[] {
    return ['label'];
  }

  id: string;
  createdAt: Date;
  patch: string;

  documentId: string;
  document: Document;

  $toJsonApi(fields?: string[]): OrbitRecord {
    const { id, createdAt, documentId } = this;
    const attributes = { 'created-at': createdAt };
    const relationships = {
      document: {
        data: {
          type: 'documents',
          id: documentId,
        },
      },
    };

    if (fields && fields.includes('patch')) {
      attributes['patch'] = this.patch;
    }

    return {
      id,
      type: 'changes',
      attributes,
      relationships,
    };
  }
}
