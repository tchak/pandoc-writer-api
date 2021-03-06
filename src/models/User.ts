import { Model, JSONSchema, RelationMappings, Modifiers } from 'objection';
import { Record as OrbitRecord } from '@orbit/data';

import { BaseModel, Document, Reference, RefreshToken } from '.';

export interface UserToken {
  sub: string;
}

export class User extends BaseModel {
  static get tableName(): string {
    return 'users';
  }

  static get modifiers(): Modifiers {
    const { ref } = User;

    return {
      deleted(builder) {
        builder.whereNotNull(ref('deleted_at'));
      },
      kept(builder, throwIfNotFound = true) {
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
      refreshTokens: {
        relation: Model.HasManyRelation,
        modelClass: RefreshToken,
        join: {
          from: 'users.id',
          to: 'refresh_tokens.user_id',
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

  static async findDocument(
    token: UserToken,
    id: string,
    withCurrentVersion = false
  ): Promise<Document> {
    const user = await this.findByToken(token);
    const query = user
      .$relatedQuery<Document>('documents')
      .modify('kept')
      .findById(id);

    if (withCurrentVersion) {
      return query.withGraphFetched('versions(last)');
    }
    return query;
  }
}
