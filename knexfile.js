module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      database: 'hora_development',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  test: {
    client: 'postgresql',
    connection: {
      database: 'hora_test',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      database: 'hora_production',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
