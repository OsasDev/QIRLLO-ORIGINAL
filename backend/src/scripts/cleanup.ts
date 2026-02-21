import { getDB, connectDB, closeDB } from '../db';

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

// Run if called directly
if (require.main === module) {
    (async () => {
        try {
            await connectDB();
            await clearExistingData();
            await closeDB();
            process.exit(0);
        } catch (err) {
            console.error('Fatal error during cleanup:', err);
            process.exit(1);
        }
    })();
}
