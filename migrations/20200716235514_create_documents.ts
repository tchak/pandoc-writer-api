import Knex from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.createTable('documents', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('title').notNullable();
    table.jsonb('meta');

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
};

exports.down = function (knex: Knex) {
  return knex.schema.dropTableIfExists('documents');
};
