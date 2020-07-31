import Knex from 'knex';

exports.up = function (knex: Knex) {
  return knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
};

exports.down = function () {
  return Promise.resolve();
};
