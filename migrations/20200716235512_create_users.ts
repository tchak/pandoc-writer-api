import Knex from 'knex';

exports.up = function (knex: Knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.text('email').notNullable().unique();
    table.text('password_hash').notNullable();

    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('deleted_at').index();
  });
};

exports.down = function (knex: Knex) {
  return knex.schema.dropTableIfExists('users');
};
