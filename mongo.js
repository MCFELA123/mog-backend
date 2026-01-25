// MongoDB connection utility for Mog.ai backend
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/mogai';

const connectMongo = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[MongoDB] Connected successfully');
  } catch (err) {
    console.error('[MongoDB] Connection error:', err);
    process.exit(1);
  }
};

module.exports = { connectMongo, mongoose };
