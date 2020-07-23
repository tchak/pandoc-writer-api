import {
  Model,
  RelationMappings,
  snakeCaseMappers,
  ColumnNameMappers,
  JSONSchema,
  Modifiers,
} from 'objection';
import { Record as OrbitRecord } from '@orbit/data';
import { serialize } from 'remark-slate';
import crypto from 'crypto';

import { Document } from '.';

export interface LeafType {
  text: string;
  strikeThrough?: boolean;
  bold?: boolean;
  italic?: boolean;
  parentType?: string;
}

export interface BlockType {
  type: string;
  parentType?: string;
  link?: string;
  break?: boolean;
  children: Array<BlockType | LeafType>;
}

export class DocumentVersion extends Model {
  static get tableName(): string {
    return 'document_versions';
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
          from: 'document_versions.document_id',
          to: 'documents.id',
        },
      },
    };
  }

  static jsonSchema: JSONSchema = {
    type: 'object',
    required: ['data'],

    properties: {
      id: { type: 'string' },
      documentId: { type: 'string' },
      sha: { type: 'string' },
      data: {
        type: 'array',
        items: { type: 'object', properties: {}, additionalProperties: true },
      },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  };

  static get modifiers(): Modifiers {
    return {
      last(builder) {
        builder.orderBy('created_at').limit(1);
      },
    };
  }

  get markdown(): string {
    return this.data.map((b) => serialize(b)).join('');
  }

  id: string;
  sha: string;
  data: BlockType[];
  documentId: string;
  createdAt: Date;
  updatedAt: Date;

  $beforeInsert(): void {
    this.sha = sha1(JSON.stringify(this.data));
  }

  $beforeUpdate(): void {
    this.updatedAt = new Date();
    this.sha = sha1(JSON.stringify(this.data));
  }

  $toJsonApi(fields?: string[]): OrbitRecord {
    const { id, createdAt, updatedAt, documentId, sha } = this;
    const attributes = {
      sha,
      'created-at': createdAt,
      'updated-at': updatedAt,
    };
    const relationships = {
      document: {
        data: {
          type: 'documents',
          id: documentId,
        },
      },
    };

    if (fields && fields.includes('data')) {
      attributes['data'] = this.data;
    }

    return {
      id,
      type: 'versions',
      attributes,
      relationships,
    };
  }
}

function sha1(str: string): string {
  const hash = crypto.createHash('sha1');
  const data = hash.update(str, 'utf8');
  return data.digest('hex');
}
