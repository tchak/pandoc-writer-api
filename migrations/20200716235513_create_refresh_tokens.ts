import Knex from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('token', 256).unique().notNullable();
    table.text('user_agent');

    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .index();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.dropTableIfExists('refresh_tokens');
};
