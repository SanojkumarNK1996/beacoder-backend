// app.js

require('dotenv').config();

const db = require('./config/db');     // ✅ single instance
require('./models');                   // load all sequelize models

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');


// Seed Imports
const Badge = require('./models/Badge.model');
const seedBadges = require('./seeds/badges.seed');
const swaggerSpec = require('./swagger');

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Routes
app.use('/api/v1/', require('./routes'));
const PORT = process.env.PORT || 3000;

const autoSeedBadges = async () => {
  try {
    const badgeCount = await Badge.count();

    if (badgeCount === 0) {
      console.log('🏆 No badges found. Seeding badge master data...');
      await seedBadges();
      console.log('✅ Badge master data seeded successfully!');
    } else {
      console.log(`🏆 ${badgeCount} badges already exist. Skipping seed.`);
    }
  } catch (error) {
    console.error('❌ Error during badge seeding:', error);
    throw error; // propagate to startup failure
  }
};

const startServer = async () => {
  try {
    console.log('🔌 Connecting to Postgres...');
    await db.connect();          // ✅ wait for DB connection

    console.log('🧱 Syncing database...');
    await db.syncDatabase();     // ✅ alter:true runs here

    console.log('🌱 Running seed checks...');
    await autoSeedBadges();      // ✅ seed only after sync

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Application startup failed:', error);
    process.exit(1);
  }
};


startServer();