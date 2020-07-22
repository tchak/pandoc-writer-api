exports.up = async function (knex) {
  await knex.schema.createTable('references', (table) => {
    table.uuid('id').primary();
    table.jsonb('data').notNull();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNull();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNull();
  });

  await knex.schema.createTable('documents_references', (table) => {
    table
      .uuid('document_id')
      .notNull()
      .references('id')
      .inTable('documents')
      .onDelete('CASCADE')
      .index();
    table
      .uuid('reference_id')
      .notNull()
      .references('id')
      .inTable('references')
      .onDelete('CASCADE')
      .index();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('documents_references');
  await knex.schema.dropTableIfExists('references');
};
