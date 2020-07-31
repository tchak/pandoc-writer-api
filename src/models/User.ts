import { Model, JSONSchema, RelationMappings, Modifiers } from 'objection';
import { Record as OrbitRecord } from '@orbit/data';

import { BaseModel, Document, Reference } from '.';

export interface UserToken {
  sub: string;
}

export class User extends BaseModel {
  static get tableName(): string {
    return 'users';
  }

  static get modifiers(): Modifiers {
    return {
      deleted(builder) {
        const { ref } = User;
        builder.whereNotNull(ref('deleted_at'));
      },
      kept(builder, throwIfNotFound = true) {
        const { ref } = User;
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
      documents: {
        relation: Model.HasManyRelation,
        modelClass: Document,
        join: {
          from: 'users.id',
          to: 'documents.user_id',
        },
      },
      references: {
        relation: Model.HasManyRelation,
        modelClass: Reference,
        join: {
          from: 'users.id',
          to: 'references.user_id',
        },
      },
    };
  }

  static jsonSchema: JSONSchema = {
    type: 'object',
    required: ['email', 'passwordHash'],

    properties: {
      id: { type: 'string' },
      email: { type: 'email' },
      passwordHash: { type: 'string' },
      createdAt: { type: 'date-time' },
      updatedAt: { type: 'date-time' },
    },
  };

  email: string;
  passwordHash: string;

  $toJsonApi(): OrbitRecord {
    const { id, email, createdAt, updatedAt } = this;
    const attributes = {
      email,
      'created-at': createdAt,
      'updated-at': updatedAt,
    };

    return {
      id,
      type: 'users',
      attributes,
    };
  }

  static async findByToken(token: UserToken): Promise<User> {
    return this.query()
      .modify('kept')
      .select('id', 'email')
      .findById(token.sub);
  }
}
