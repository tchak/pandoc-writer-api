import {
  Model,
  JSONSchema,
  RelationMappings,
  ColumnNameMappers,
  snakeCaseMappers,
  QueryContext,
} from 'objection';
import { nanoid } from 'nanoid';

import { User } from '.';

export class RefreshToken extends Model {
  static get tableName(): string {
    return 'refresh_tokens';
  }

  static get columnNameMappers(): ColumnNameMappers {
    return snakeCaseMappers();
  }

  static get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'refresh_tokens.user_id',
          to: 'users.id',
        },
      },
    };
  }

  static jsonSchema: JSONSchema = {
    type: 'object',

    properties: {
      id: { type: 'string' },
      token: { type: 'string', minLength: 256 },
      userAgent: { type: 'string' },
      createdAt: { type: 'date-time' },
    },
  };

  id: string;
  token: string;
  userAgent: string;
  user: User;

  $beforeInsert(context: QueryContext): void {
    super.$beforeInsert(context);
    this.token = nanoid(256);
  }
}
