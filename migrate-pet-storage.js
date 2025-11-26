// Migration script to add Pet Storage columns
const auth = require('./auth');

async function migrate() {
    try {
        console.log('🔄 Starting database migration...');

        const result = await auth.pool.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS stored_pets TEXT[] DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS current_pet TEXT DEFAULT NULL;
        `);

        console.log('✅ Migration completed successfully!');
        console.log('   - Added stored_pets column (TEXT array)');
        console.log('   - Added current_pet column (TEXT)');

        // Verify columns exist
        const verify = await auth.pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('stored_pets', 'current_pet');
        `);

        console.log('\n📊 Verified columns:');
        verify.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
