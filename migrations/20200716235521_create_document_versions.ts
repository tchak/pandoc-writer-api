import Knex from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.createTable('document_versions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.jsonb('data').notNullable();
    table.string('sha').notNullable();

    table
      .uuid('document_id')
      .notNullable()
      .references('id')
      .inTable('documents')
      .onDelete('CASCADE')
      .index();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at').index();
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.dropTableIfExists('document_versions');
};
