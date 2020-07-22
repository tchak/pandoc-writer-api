import {
  Model,
  snakeCaseMappers,
  ColumnNameMappers,
  JSONSchema,
} from 'objection';
import { Record as OrbitRecord } from '@orbit/data';

export default class Reference extends Model {
  static get tableName(): string {
    return 'references';
  }

  static get columnNameMappers(): ColumnNameMappers {
    return snakeCaseMappers();
  }

  static jsonSchema: JSONSchema = {
    type: 'object',
    required: [],

    properties: {
      id: { type: 'string' },
      data: { type: 'object', properties: {}, additionalProperties: true },
      createdAt: { type: 'string' },
      updatedAt: { type: 'string' },
    },
  };

  id: string;
  createdAt: Date;
  updatedAt: Date;
  data: unknown;

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
