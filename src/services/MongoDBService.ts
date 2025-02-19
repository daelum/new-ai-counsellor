import { MongoClient, Document, ObjectId } from 'mongodb';
import { MONGODB_URI } from '@env';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}
const client = new MongoClient(MONGODB_URI);

export interface Prayer {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  prayerCount: number;
  prayedBy: string[]; // Array of userIds who have prayed
}

class MongoDBService {
  private static instance: MongoDBService;
  private constructor() {}

  static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  async connect() {
    try {
      await client.connect();
      console.log("Successfully connected to MongoDB.");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error);
      throw error;
    }
  }

  async getAllPrayers(): Promise<Prayer[]> {
    try {
      const database = client.db('solomon-app');
      const prayers = database.collection('prayers');
      const documents = await prayers.find({}).sort({ timestamp: -1 }).toArray();
      return documents.map(doc => ({
        id: doc._id.toString(),
        userId: doc.userId as string,
        username: doc.username as string,
        content: doc.content as string,
        timestamp: new Date(doc.timestamp),
        prayerCount: doc.prayerCount as number,
        prayedBy: doc.prayedBy as string[],
      }));
    } catch (error) {
      console.error("Error fetching prayers:", error);
      throw error;
    }
  }

  async addPrayer(prayer: Omit<Prayer, 'id'>): Promise<Prayer> {
    try {
      const database = client.db('solomon-app');
      const prayers = database.collection('prayers');
      const result = await prayers.insertOne(prayer);
      return {
        ...prayer,
        id: result.insertedId.toString(),
      };
    } catch (error) {
      console.error("Error adding prayer:", error);
      throw error;
    }
  }

  async updatePrayerCount(prayerId: string, userId: string, isPraying: boolean): Promise<void> {
    try {
      const database = client.db('solomon-app');
      const prayers = database.collection('prayers');
      
      if (isPraying) {
        await prayers.updateOne(
          { _id: new ObjectId(prayerId) },
          { 
            $inc: { prayerCount: 1 },
            $addToSet: { prayedBy: userId }
          }
        );
      } else {
        await prayers.updateOne(
          { _id: new ObjectId(prayerId) },
          { 
            $inc: { prayerCount: -1 },
            $pull: { prayedBy: userId }
          }
        );
      }
    } catch (error) {
      console.error("Error updating prayer count:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await client.close();
      console.log("Successfully disconnected from MongoDB.");
    } catch (error) {
      console.error("Error disconnecting from MongoDB:", error);
      throw error;
    }
  }
}

export default MongoDBService.getInstance(); 