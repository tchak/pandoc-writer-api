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
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
  },
};
