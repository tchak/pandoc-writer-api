import {
  Model,
  RelationMappings,
  snakeCaseMappers,
  ColumnNameMappers,
} from 'objection';
import { Record as OrbitRecord } from '@orbit/data';

import Change from './change';

export default class Document extends Model {
  static get tableName(): string {
    return 'documents';
  }

  static get columnNameMappers(): ColumnNameMappers {
    return snakeCaseMappers();
  }

  static get relationMappings(): RelationMappings {
    return {
      changes: {
        relation: Model.HasManyRelation,
        modelClass: Change,
        join: {
          from: 'documents.id',
          to: 'changes.document_id',
        },
      },
    };
  }

  static jsonSchema = {
    type: 'object',
    required: ['title', 'etag'],

    properties: {
      id: { type: 'string' },
      etag: { type: 'string' },
      title: { type: 'string', minLength: 1 },
      body: { type: 'string' },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  };

  id: string;
  etag: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;

  changes: Change[];

  $beforeUpdate(): void {
    this.updatedAt = new Date();
  }

  $toJsonApi(): OrbitRecord {
    const { id, title, etag, body, createdAt, updatedAt } = this;

    return {
      id,
      type: 'documents',
      attributes: {
        title,
        body,
        etag,
        'created-at': createdAt,
        'updated-at': updatedAt,
      },
    };
  }
}
