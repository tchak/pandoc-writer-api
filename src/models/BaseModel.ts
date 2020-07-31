import {
  Model,
  snakeCaseMappers,
  ColumnNameMappers,
  ModelOptions,
  QueryContext,
} from 'objection';
import { DBErrors } from 'objection-db-errors';
import { DateTime } from 'luxon';

export class BaseModel extends DBErrors(Model) {
  static get columnNameMappers(): ColumnNameMappers {
    return snakeCaseMappers();
  }

  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;

  $beforeUpdate(opt: ModelOptions, context: QueryContext): void {
    super.$beforeUpdate(opt, context);
    this.updatedAt = new Date();
  }

  async $destroy(): Promise<void> {
    await this.$query().patch({ deletedAt: DateTime.utc().toJSDate() });
  }
}
