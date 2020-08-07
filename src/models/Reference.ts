import {
  Model,
  JSONSchema,
  RelationMappings,
  Modifiers,
  QueryContext,
  ModelOptions,
} from 'objection';
import { Record as OrbitRecord } from '@orbit/data';

import { BaseModel, Document, User } from '.';
import { pluck, toTsQuery, orderBy } from '../utils';
import { Item } from '../lib/zotero';

export class Reference extends BaseModel {
  static get tableName(): string {
    return 'references';
  }

  static get modifiers(): Modifiers {
    return {
      deleted(builder) {
        const { ref } = Reference;
        builder.whereNotNull(ref('deleted_at'));
      },
      kept(builder, throwIfNotFound = true) {
        const { ref } = Reference;
        builder = builder.whereNull(ref('deleted_at'));

        if (throwIfNotFound) {
          return builder.throwIfNotFound();
        }
        return builder;
      },
      order(builder, order) {
        const { ref } = Reference;
        const [column, direction] = orderBy(ref, order);
        return builder.orderBy(column, direction);
      },
      search(builder, term?: string) {
        if (term) {
          builder.whereRaw(`search_tokens @@ to_tsquery(?)`, [toTsQuery(term)]);
        }
        return builder;
      },
    };
  }

  static get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'references.user_id',
          to: 'users.id',
        },
      },
      documents: {
        relation: Model.ManyToManyRelation,
        modelClass: Document,
        join: {
          from: 'references.id',
          through: {
            from: 'documents_references.reference_id',
            to: 'documents_references.document_id',
          },
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
      data: { type: 'object', properties: {}, additionalProperties: true },
      createdAt: { type: 'date-time' },
      updatedAt: { type: 'date-time' },
    },
  };

  data: Item;
  language: string;
  searchText: string;

  $beforeInsert(context: QueryContext): void {
    super.$beforeInsert(context);
    this.searchText = [this.data.title, this.data.abstract]
      .filter((text) => text)
      .join(' ');
  }

  $beforeUpdate(opt: ModelOptions, context: QueryContext): void {
    super.$beforeUpdate(opt, context);
    this.searchText = [this.data.title, this.data.abstract]
      .filter((text) => text)
      .join(' ');
  }

  $toJsonApi(fields?: string[]): OrbitRecord {
    const { id, createdAt, updatedAt } = this;
    const attributes = {
      'created-at': createdAt,
      'updated-at': updatedAt,
    };

    if (fields && fields.includes('data')) {
      attributes['data'] = this.data;
    } else {
      attributes['data'] = pluck(
        (this.data as unknown) as Record<string, unknown>,
        'type',
        'title',
        'author',
        'issued'
      );
    }

    return {
      id,
      type: 'references',
      attributes,
    };
  }
}
