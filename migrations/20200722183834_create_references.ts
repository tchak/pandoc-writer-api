import Knex from 'knex';

exports.up = async function (knex: Knex) {
  await knex.schema.createTable('references', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.jsonb('data').notNullable();

    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .index();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at').index();
  });

  await knex.schema.createTable('documents_references', (table) => {
    table.boolean('nocite').defaultTo(false).notNullable();
    table
      .uuid('document_id')
      .notNullable()
      .references('id')
      .inTable('documents')
      .onDelete('CASCADE')
      .index();
    table
      .uuid('reference_id')
      .notNullable()
      .references('id')
      .inTable('references')
      .onDelete('CASCADE')
      .index();
  });
};

exports.down = async function (knex: Knex) {
  await knex.schema.dropTableIfExists('documents_references');
  await knex.schema.dropTableIfExists('references');
};
