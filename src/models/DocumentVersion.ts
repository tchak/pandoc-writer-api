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
import { safeDump } from 'js-yaml';

import { BlockType, stringify } from '../lib/unist';
import { BaseModel, Document } from '.';
import { orderBy } from '../utils';

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
    const { ref } = DocumentVersion;

    return {
      ...super.modifiers,
      last(builder) {
        builder.orderBy(ref('created_at'), 'DESC').limit(1);
      },
      deleted(builder) {
        builder.whereNotNull(ref('deleted_at'));
      },
      kept(builder, throwIfNotFound = true) {
        builder = builder
          .whereNull(ref('deleted_at'))
          .joinRelated('document')
          .whereNull('document.deleted_at');

        if (throwIfNotFound) {
          return builder.throwIfNotFound();
        }
        return builder;
      },
      order(builder, order) {
        const [column, direction] = orderBy(ref, order);
        return builder.orderBy(column, direction);
      },
    };
  }

  get frontmatter(): string {
    const frontmatter = safeDump({
      'suppress-bibliography': true,
    });
    return `---\n${frontmatter}\n...\n`;
  }

  get markdownWithFrontmatter(): string {
    return `${this.frontmatter}${this.markdown}`;
  }

  get markdown(): string {
    return stringify(this.data);
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
  searchText: string;

  $beforeInsert(context: QueryContext): void {
    super.$beforeInsert(context);
    this.sha = sha1(JSON.stringify(this.data));
    this.searchText = this.text;
  }

  $beforeUpdate(opt: ModelOptions, context: QueryContext): void {
    super.$beforeUpdate(opt, context);
    this.sha = sha1(JSON.stringify(this.data));
    this.searchText = this.text;
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
