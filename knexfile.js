module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      database: 'pandown_dev',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  test: {
    client: 'postgresql',
    connection: {
      database: 'pandown_test',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      database: 'pandown_prod',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
