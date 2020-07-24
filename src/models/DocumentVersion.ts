import {
  Model,
  RelationMappings,
  JSONSchema,
  Modifiers,
  ModelOptions,
  QueryContext,
} from 'objection';
import { Record as OrbitRecord } from '@orbit/data';
import crypto from 'crypto';

import { BlockType, serialize } from '../lib/mdast-slate';
import { BaseModel, Document } from '.';

function sha1(str: string): string {
  const hash = crypto.createHash('sha1');
  const data = hash.update(str, 'utf8');
  return data.digest('hex');
}

export class DocumentVersion extends BaseModel {
  static get tableName(): string {
    return 'document_versions';
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
      ...super.modifiers,
      last(builder) {
        builder.orderBy('created_at').limit(1);
      },
    };
  }

  get markdown(): string {
    return this.data.map((b) => serialize(b)).join('');
  }

  sha: string;
  data: BlockType[];
  documentId: string;

  $beforeInsert(context: QueryContext): void {
    super.$beforeInsert(context);
    this.sha = sha1(JSON.stringify(this.data));
  }

  $beforeUpdate(opt: ModelOptions, context: QueryContext): void {
    super.$beforeUpdate(opt, context);
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
