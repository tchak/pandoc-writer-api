exports.up = function (knex) {
  return knex.schema.createTable('changes', (table) => {
    table.uuid('id').primary();
    table.text('patch').notNull();

    table
      .uuid('document_id')
      .notNull()
      .references('id')
      .inTable('documents')
      .onDelete('CASCADE')
      .index();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('changes');
};
