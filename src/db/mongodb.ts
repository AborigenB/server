import { MongoClient } from 'mongodb';
import { config } from '../config/process';

const client = new MongoClient(config.mongodbUri);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Connection error:', error);
    process.exit(1);
  }
}

export default connectToMongoDB;