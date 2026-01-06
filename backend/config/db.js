const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log('Attempting to connect to MongoDB...');

    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    // Add a connection timeout
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of default 30s
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (error.message.includes('MongooseServerSelectionError') || error.message.includes('whitelisted')) {
      console.error('\n--- TROUBLESHOOTING ---');
      console.error('If you are using MongoDB Atlas, please ensure:');
      console.error('1. Your current IP address is whitelisted in Atlas (Network Access).');
      console.error('2. Your database user has the correct permissions.');
      console.error('3. Your MONGO_URI in .env is correct.');
      console.error('Alternative: You can use a local MongoDB by changing MONGO_URI in .env to:');
      console.error('MONGO_URI=mongodb://127.0.0.1:27017/arivom_learning_platform');
      console.error('-----------------------\n');
    }
    // Don't exit immediately in dev, let nodemon try again if we change .env
    // process.exit(1); 
  }
};

module.exports = connectDB;
