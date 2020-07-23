exports.up = function (knex) {
  return knex.schema.createTable('document_versions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.jsonb('data').notNull();
    table.string('sha').notNull();

    table
      .uuid('document_id')
      .notNull()
      .references('id')
      .inTable('documents')
      .onDelete('CASCADE')
      .index();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNull();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('document_versions');
};
