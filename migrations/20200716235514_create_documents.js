exports.up = function (knex) {
  return knex.schema.createTable('documents', (table) => {
    table.uuid('id').primary();
    table.string('title').notNull();
    table.text('body').notNull();
    table.uuid('etag').notNull();
    table.jsonb('meta');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNull();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('documents');
};
