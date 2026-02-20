
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URL = process.env.MONGO_URL || '';
const DB_NAME = process.env.DB_NAME || 'qirllo';

async function resetDB() {
    if (!MONGO_URL) {
        console.error('MONGO_URL not found in .env');
        process.exit(1);
    }

    console.log(`Connecting to ${MONGO_URL}...`);
    const client = new MongoClient(MONGO_URL);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        console.log(`Connected to database: ${DB_NAME}`);

        console.log('Dropping database...');
        await db.dropDatabase();
        console.log('Database dropped successfully.');

    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        await client.close();
        process.exit(0);
    }
}

resetDB();
