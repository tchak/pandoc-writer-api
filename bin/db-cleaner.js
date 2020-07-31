/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
require('ts-node/register');

const cleaner = require('knex-cleaner');
const Knex = require('knex');
const knexConfig = require('../knexfile');

const knex = Knex(knexConfig.test);
cleaner.clean(knex).then(() => knex.destroy());
