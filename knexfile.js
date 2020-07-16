module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      database: 'pandown-dev',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      database: 'pandown-prod',
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};
