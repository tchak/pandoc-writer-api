import {
  Model,
  snakeCaseMappers,
  ColumnNameMappers,
  ModelOptions,
  QueryContext,
} from 'objection';
import { DBErrors } from 'objection-db-errors';

export class BaseModel extends DBErrors(Model) {
  static get columnNameMappers(): ColumnNameMappers {
    return snakeCaseMappers();
  }

  id: string;
  createdAt: Date;
  updatedAt: Date;

  $beforeUpdate(opt: ModelOptions, context: QueryContext): void {
    super.$beforeUpdate(opt, context);
    this.updatedAt = new Date();
  }
}
