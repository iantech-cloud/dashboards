// scripts/migrate-transactions.js - ONE-TIME MIGRATION SCRIPT
// Run this once to add target_type and target_id to existing transactions

require('dotenv').config(); // Load environment variables from .env file
const mongoose = require('mongoose');

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

// Company ID for revenue transactions
const COMPANY_ID = '68fe57599f8dedf3462a6158';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

async function migrateTransactions() {
  try {
    console.log('🔄 Starting transaction migration...');
    console.log(`📝 Using database: ${MONGODB_URI.split('@')[1]?.split('/')[1] || 'unknown'}`);
    console.log(`🏢 Company ID: ${COMPANY_ID}`);
    
    // Connect to MongoDB with better options
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');

    // Count transactions that need migration
    const needsMigration = await transactionsCollection.countDocuments({
      target_type: { $exists: false }
    });

    console.log(`📊 Found ${needsMigration} transactions to migrate`);

    if (needsMigration === 0) {
      console.log('✅ All transactions already migrated!');
      await mongoose.disconnect();
      return;
    }

    // Migrate transactions in batches
    const batchSize = 100;
    let migrated = 0;
    let companyTransactions = 0;

    const cursor = transactionsCollection.find({
      target_type: { $exists: false }
    });

    const batch = [];

    for await (const doc of cursor) {
      // Determine target_type based on transaction type
      let target_type = 'user';
      let target_id = doc.user_id;

      // Company revenue transactions
      if (['COMPANY_REVENUE', 'UNCLAIMED_REFERRAL'].includes(doc.type)) {
        target_type = 'company';
        target_id = COMPANY_ID;
        companyTransactions++;
      }

      batch.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              target_type: target_type,
              target_id: target_id
            }
          }
        }
      });

      if (batch.length >= batchSize) {
        await transactionsCollection.bulkWrite(batch);
        migrated += batch.length;
        console.log(`✅ Migrated ${migrated}/${needsMigration} transactions...`);
        batch.length = 0;
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      await transactionsCollection.bulkWrite(batch);
      migrated += batch.length;
      console.log(`✅ Migrated ${migrated}/${needsMigration} transactions...`);
    }

    console.log('🎉 Migration completed successfully!');
    console.log(`📊 Total migrated: ${migrated} transactions`);
    console.log(`🏢 Company transactions updated: ${companyTransactions} transactions`);
    
    // Show summary
    const summary = await transactionsCollection.aggregate([
      {
        $group: {
          _id: '$target_type',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    console.log('\n📈 Transaction Summary by Target Type:');
    summary.forEach(item => {
      console.log(`   ${item._id}: ${item.count} transactions`);
    });

    // Show company transaction breakdown
    const companySummary = await transactionsCollection.aggregate([
      {
        $match: { target_type: 'company' }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    console.log('\n🏢 Company Transaction Breakdown:');
    companySummary.forEach(item => {
      console.log(`   ${item._id}: ${item.count} transactions`);
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateTransactions();
}

// Export for module usage
module.exports = { migrateTransactions };
