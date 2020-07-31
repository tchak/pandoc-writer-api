import { Model, JSONSchema, RelationMappings, Modifiers } from 'objection';
import { Record as OrbitRecord } from '@orbit/data';

import { BaseModel, Document, User } from '.';
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

  $toJsonApi(fields?: string[]): OrbitRecord {
    const { id, createdAt, updatedAt } = this;
    const attributes = {
      'created-at': createdAt,
      'updated-at': updatedAt,
    };

    if (fields && fields.includes('data')) {
      attributes['data'] = this.data;
    }

    return {
      id,
      type: 'references',
      attributes,
    };
  }
}
