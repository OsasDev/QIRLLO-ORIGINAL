import { MongoClient, Db } from 'mongodb';
import { MONGO_URL, DB_NAME } from './config';

let db: Db;
let client: MongoClient;

export async function connectDB(): Promise<Db> {
    if (db) return db;

    // Mask password in logs
    const maskedUrl = MONGO_URL.replace(/:([^@]+)@/, ':****@');
    console.log('Connecting to MongoDB with URL:', maskedUrl);
    console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED);

    client = new MongoClient(MONGO_URL, {
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 30000,
        // Let the connection string handle TLS/SSL automatically
    });
    try {
        await client.connect();
        db = client.db(DB_NAME);
        console.log(`Connected to MongoDB: ${DB_NAME}`);
        return db;
    } catch (err) {
        console.error('MongoDB connection error details:', err);
        throw err;
    }
}

export function getDB(): Db {
    if (!db) throw new Error('Database not connected. Call connectDB() first.');
    return db;
}

export async function closeDB(): Promise<void> {
    if (client) {
        await client.close();
        console.log('MongoDB connection closed');
    }
}
