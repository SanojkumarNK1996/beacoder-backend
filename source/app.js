require('dotenv').config();
require('./config/db').connect()
require('./models');
require('./config/db').syncDatabase();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());         // Security headers
app.use(morgan('dev'))

// Routes
app.use('/api/v1/', require('./routes'));

const PORT = process.env.PORT
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
})