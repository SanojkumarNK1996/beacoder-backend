// app.js

require('dotenv').config();

const db = require('./config/db');     // ✅ single instance
require('./models');                   // load all sequelize models

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');


const swaggerSpec = require('./swagger');

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: "2mb" }));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use('/api/v1/', require('./routes'));
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log('🔌 Connecting to Postgres...');
    await db.connect();          // ✅ wait for DB connection

    console.log('🧱 Syncing database...');
    await db.syncDatabase();     // ✅ alter:true runs here

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Application startup failed:', error);
    process.exit(1);
  }
};


startServer();