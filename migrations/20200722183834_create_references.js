exports.up = function (knex) {
  return knex.schema.createTable('references', (table) => {
    table.uuid('id').primary();
    table.jsonb('data').notNull();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNull();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('references');
};
