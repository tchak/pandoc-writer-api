// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
require('ts-node/register');

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
  },

  test: {
    client: 'pg',
    connection: {
      database: process.env.POSTGRES_DB,
      ...(process.env.POSTGRES_HOST
        ? { host: process.env.POSTGRES_HOST }
        : undefined),
      ...(process.env.POSTGRES_PORT
        ? { port: process.env.POSTGRES_PORT }
        : undefined),
      ...(process.env.POSTGRES_USER
        ? { user: process.env.POSTGRES_USER }
        : undefined),
      ...(process.env.POSTGRES_PASSWORD
        ? { password: process.env.POSTGRES_PASSWORD }
        : undefined),
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default module.exports;
