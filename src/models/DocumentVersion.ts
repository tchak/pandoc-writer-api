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
import remark from 'remark';
import lint from 'remark-preset-lint-recommended';
import report from 'vfile-reporter';
import strip from 'strip-markdown';

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
        relation: Model.BelongsToOneRelation,
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
      createdAt: { type: 'date-time' },
      updatedAt: { type: 'date-time' },
    },
  };

  static get modifiers(): Modifiers {
    return {
      ...super.modifiers,
      last(builder) {
        const { ref } = DocumentVersion;
        builder.orderBy(ref('created_at')).limit(1);
      },
      deleted(builder) {
        const { ref } = DocumentVersion;
        builder.whereNotNull(ref('deleted_at'));
      },
      kept(builder, throwIfNotFound = true) {
        const { ref } = DocumentVersion;
        builder = builder.whereNull(ref('deleted_at'));

        if (throwIfNotFound) {
          return builder.throwIfNotFound();
        }
        return builder;
      },
    };
  }

  get markdown(): string {
    return this.data.map((b) => serialize(b)).join('');
  }

  get text(): string {
    return remark().use(strip).processSync(this.markdown).toString();
  }

  get report(): string {
    const file = remark().use(lint).processSync(this.markdown);
    return report(file);
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
