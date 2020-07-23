import {
  Model,
  snakeCaseMappers,
  ColumnNameMappers,
  ModelOptions,
  QueryContext,
  Modifiers,
} from 'objection';
import { DBErrors } from 'objection-db-errors';

export class BaseModel extends DBErrors(Model) {
  static get columnNameMappers(): ColumnNameMappers {
    return snakeCaseMappers();
  }

  static get modifiers(): Modifiers {
    return {
      deleted(builder) {
        builder.whereNotNull('documents.deleted_at');
      },
      kept(builder) {
        builder.whereNull('documents.deleted_at');
      },
    };
  }

  id: string;
  createdAt: Date;
  updatedAt: Date;

  $beforeUpdate(opt: ModelOptions, context: QueryContext): void {
    super.$beforeUpdate(opt, context);
    this.updatedAt = new Date();
  }
}
