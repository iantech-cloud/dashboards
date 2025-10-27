// scripts/update-company-id.js - Update Company Transaction IDs
// Run this after the main migration to set correct company ID

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;
const COMPANY_ID = '68fe57599f8dedf3462a6158'; // Your actual company ID

// Validate MongoDB URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  console.error('💡 Please set MONGODB_URI in your .env file or environment variables');
  console.error('💡 Example: MONGODB_URI=mongodb://localhost:27017/your-database-name');
  process.exit(1);
}

if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  console.error('❌ Invalid MongoDB connection string');
  console.error('💡 Connection string must start with "mongodb://" or "mongodb+srv://"');
  console.error('💡 Your current MONGODB_URI:', MONGODB_URI);
  process.exit(1);
}

async function updateCompanyTransactions() {
  try {
    console.log('🏢 Starting company transaction update...');
    console.log(`📋 Company ID: ${COMPANY_ID}`);
    console.log(`📝 Database: ${MONGODB_URI.split('@').pop() || 'unknown'}`);
    console.log(`💡 ACTIVATION_FEE will be treated as company profit`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');

    // Step 1: Count transactions that need updating
    const needsUpdate = await transactionsCollection.countDocuments({
      type: { $in: ['COMPANY_REVENUE', 'UNCLAIMED_REFERRAL', 'ACTIVATION_FEE'] },
      $or: [
        { target_type: { $ne: 'company' } },
        { target_id: { $ne: COMPANY_ID } }
      ]
    });

    console.log(`📊 Found ${needsUpdate} company transactions to update`);

    if (needsUpdate === 0) {
      console.log('✅ All company transactions already updated!');
      await mongoose.disconnect();
      return;
    }

    // Step 2: Update COMPANY_REVENUE transactions
    console.log('\n📝 Updating COMPANY_REVENUE transactions...');
    const companyRevenueResult = await transactionsCollection.updateMany(
      { 
        type: 'COMPANY_REVENUE',
        $or: [
          { target_type: { $ne: 'company' } },
          { target_id: { $ne: COMPANY_ID } }
        ]
      },
      { 
        $set: { 
          target_type: 'company',
          target_id: COMPANY_ID
        } 
      }
    );
    console.log(`✅ Updated ${companyRevenueResult.modifiedCount} COMPANY_REVENUE transactions`);

    // Step 3: Update UNCLAIMED_REFERRAL transactions
    console.log('\n📝 Updating UNCLAIMED_REFERRAL transactions...');
    const unclaimedResult = await transactionsCollection.updateMany(
      { 
        type: 'UNCLAIMED_REFERRAL',
        $or: [
          { target_type: { $ne: 'company' } },
          { target_id: { $ne: COMPANY_ID } }
        ]
      },
      { 
        $set: { 
          target_type: 'company',
          target_id: COMPANY_ID
        } 
      }
    );
    console.log(`✅ Updated ${unclaimedResult.modifiedCount} UNCLAIMED_REFERRAL transactions`);

    // Step 4: Update ACTIVATION_FEE as company profit
    console.log('\n📝 Updating ACTIVATION_FEE transactions as company profit...');
    const activationFees = await transactionsCollection.countDocuments({
      type: 'ACTIVATION_FEE'
    });
    
    if (activationFees > 0) {
      console.log(`   Found ${activationFees} ACTIVATION_FEE transactions`);
      
      // Check current state of ACTIVATION_FEE transactions
      const activationFeeSummary = await transactionsCollection.aggregate([
        {
          $match: { type: 'ACTIVATION_FEE' }
        },
        {
          $group: {
            _id: '$target_type',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      console.log('   Current ACTIVATION_FEE distribution:');
      activationFeeSummary.forEach(item => {
        console.log(`     ${item._id || 'no target_type'}: ${item.count} transactions`);
      });
      
      // Update ACTIVATION_FEE as company transactions
      const activationResult = await transactionsCollection.updateMany(
        { 
          type: 'ACTIVATION_FEE',
          $or: [
            { target_type: { $ne: 'company' } },
            { target_id: { $ne: COMPANY_ID } }
          ]
        },
        { 
          $set: { 
            target_type: 'company',
            target_id: COMPANY_ID
          } 
        }
      );
      console.log(`✅ Updated ${activationResult.modifiedCount} ACTIVATION_FEE transactions`);
    } else {
      console.log('   No ACTIVATION_FEE transactions found');
    }

    // Step 5: Verification
    console.log('\n🔍 Verification:');
    
    const companyTransactions = await transactionsCollection.countDocuments({
      target_type: 'company',
      target_id: COMPANY_ID
    });
    console.log(`✅ Total company transactions: ${companyTransactions}`);

    const summary = await transactionsCollection.aggregate([
      {
        $match: {
          target_type: 'company',
          target_id: COMPANY_ID
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount_cents' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    console.log('\n📊 Company Transactions Summary:');
    summary.forEach(item => {
      const amountKES = (item.totalAmount / 100).toFixed(2);
      console.log(`   ${item._id}: ${item.count} transactions, KES ${amountKES}`);
    });

    // Calculate total company revenue
    const totalRevenue = summary.reduce((sum, item) => sum + item.totalAmount, 0);
    console.log(`\n💰 Total Company Revenue: KES ${(totalRevenue / 100).toFixed(2)}`);

    // Step 6: Verify user transactions
    const userTransactions = await transactionsCollection.countDocuments({
      target_type: 'user'
    });
    console.log(`\n👥 Total user transactions: ${userTransactions}`);

    // Show any remaining transactions that might need attention
    const remainingCompanyType = await transactionsCollection.countDocuments({
      type: { $in: ['COMPANY_REVENUE', 'UNCLAIMED_REFERRAL', 'ACTIVATION_FEE'] },
      $or: [
        { target_type: { $ne: 'company' } },
        { target_id: { $ne: COMPANY_ID } }
      ]
    });

    if (remainingCompanyType > 0) {
      console.log(`\n⚠️  Found ${remainingCompanyType} company-type transactions that still need attention`);
    } else {
      console.log(`\n✅ All company-type transactions have been properly assigned!`);
    }

    console.log('\n🎉 Company transaction update completed successfully!');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Update error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run update if called directly
if (require.main === module) {
  updateCompanyTransactions();
}

module.exports = { updateCompanyTransactions };
