exports.up = function (knex) {
  return knex.schema.createTable('documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('title').notNull();
    table.jsonb('meta');

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNull().index();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNull().index();
    table.timestamp('deleted_at').index();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('documents');
};
