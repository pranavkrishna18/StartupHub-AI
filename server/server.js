const dotenv = require('dotenv');

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Load Env variables
dotenv.config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const Category = require('./src/models/Category');

// Seed default categories
const seedCategories = async () => {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      const defaultCategories = [
        { name: 'SaaS', slug: 'saas' },
        { name: 'Artificial Intelligence', slug: 'ai' },
        { name: 'FinTech', slug: 'fintech' },
        { name: 'HealthTech', slug: 'healthtech' },
        { name: 'Web3 & Crypto', slug: 'web3' },
        { name: 'EdTech', slug: 'edtech' },
        { name: 'Developer Tools', slug: 'dev-tools' }
      ];
      await Category.insertMany(defaultCategories);
      console.log('🌱 Default categories seeded successfully!');
    }
  } catch (error) {
    console.error('Failed to seed default categories:', error.message);
  }
};

const http = require('http');
const { initSocket } = require('./src/config/socket');
const { initCronJobs } = require('./src/services/cronService');

const port = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.IO Server
initSocket(server);

// Connect to Database and start Server
connectDB().then(() => {
  seedCategories();
  initCronJobs();
  server.listen(port, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${port}`);
  });
});

// Handle unhandled rejections
process.on('unhandledRejection', err => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
