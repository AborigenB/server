import mongoose from 'mongoose';
import { config } from './process';

export async function connectToMongoDB() {
  try {
    console.log('🐳 Connecting to MongoDB in Docker...');
    
    // Проверка наличия URI подключения к MongoDB
    if (!config.mongodbUri) {
      throw new Error('MONGO_DB_URL is not defined in environment variables');
    }
    
    const maskedUri = config.mongodbUri.replace(/:[^:]*@/, ':****@');
    console.log('📡 Connection string:', maskedUri);

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log('✅ Connected to MongoDB in Docker successfully!');
    console.log(`📊 Database: ${mongoose.connection.db?.databaseName}`);
    console.log(`🎯 Host: ${mongoose.connection.host}`);
    console.log(`👤 User: ${mongoose.connection.user}`);

  } catch (error: any) {
    console.error('❌ Failed to connect to MongoDB in Docker:');
    console.error('Error:', error.message);
    
    process.exit(1);
  }
}