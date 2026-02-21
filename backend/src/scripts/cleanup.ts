import { getDB } from '../db';

export async function clearExistingData() {
    const db = getDB();
    const collections = [
        'users',
        'students',
        'classes',
        'subjects',
        'grades',
        'messages',
        'announcements',
        'attendance',
        'fee_structures',
        'fee_payments',
        'school_settings'
    ];

    console.log('🧹 Wiping existing data...');
    for (const collection of collections) {
        try {
            await db.collection(collection).deleteMany({});
            console.log(`✅ Cleared collection: ${collection}`);
        } catch (err) {
            console.error(`❌ Failed to clear collection: ${collection}`, err);
        }
    }
    console.log('✨ Database is now fresh.');
}
