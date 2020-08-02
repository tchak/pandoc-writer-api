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

    table.text('search_text');
    table.specificType('search_config', 'regconfig').defaultTo('english');
    table.specificType('search_tokens', 'tsvector');
    table.index('search_tokens', null, 'gin');

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

  await knex.raw(
    `CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON "references" FOR EACH ROW EXECUTE PROCEDURE tsvector_update_trigger_column(search_tokens, search_config, search_text);`
  );
};

exports.down = async function (knex: Knex) {
  await knex.schema.dropTableIfExists('documents_references');
  await knex.schema.dropTableIfExists('references');
};
