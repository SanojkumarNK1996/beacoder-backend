const { Sequelize } = require('sequelize');

class PostgresConnector {
  constructor() {
    this.PG_DB_URI = process.env.PG_DB_URI;
    this.pgConn = new Sequelize(this.PG_DB_URI, { logging: false });
    this.POSTGRES_RETRY_COUNT = 0;
    this.POSTGRES_RETRY_LIMIT = 3;
    this.RETRY_TIMEOUT = 5 * 1000; // 5 seconds
  }

  handleConnectionError(error) {
    if (this.POSTGRES_RETRY_COUNT < this.POSTGRES_RETRY_LIMIT) {
      console.error('Postgres connection error:', error.message);
      this.POSTGRES_RETRY_COUNT += 1;
      setTimeout(() => {
        console.log('Retrying Postgres connection...');
        this.connect();
      }, this.RETRY_TIMEOUT);
    } else {
      console.error('Postgres connection error:', error.message);
      console.log('Retry Limit Exceeded. Terminating process...');
      process.exit(1);
    }
  }

  async connect() {
    try {
      await this.pgConn.authenticate();
      console.log('✅ Connected to Postgres');
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async syncDatabase() {
    try {
      await this.pgConn.sync({ alter: true });
      console.log('✅ Database Synced');
    } catch (error) {
      console.error('❌ Database Synchronization Error:', error.message);
      if (error.sql) console.error('Failed SQL:', error.sql);
      process.exit(1);
    }
  }
}

const db = new PostgresConnector();

module.exports = db;