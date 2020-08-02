import Knex from 'knex';

exports.up = async function (knex: Knex) {
  await knex.schema.createTable('document_versions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.jsonb('data').notNullable();
    table.string('sha').notNullable();

    table.text('search_text');
    table.specificType('search_config', 'regconfig').defaultTo('english');
    table.specificType('search_tokens', 'tsvector');
    table.index('search_tokens', null, 'gin');

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

  await knex.raw(
    `CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE ON "document_versions" FOR EACH ROW EXECUTE PROCEDURE tsvector_update_trigger_column(search_tokens, search_config, search_text);`
  );
};

exports.down = function (knex: Knex) {
  return knex.schema.dropTableIfExists('document_versions');
};
