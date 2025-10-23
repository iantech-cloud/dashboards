require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hustlehubafrica';

async function migrateSurveys() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the surveys collection
    const db = mongoose.connection.db;
    const surveysCollection = db.collection('surveys');

    console.log('Starting survey migration...');

    // Add missing fields to all surveys
    const result = await surveysCollection.updateMany(
      { 
        $or: [
          { is_manually_enabled: { $exists: false } },
          { max_responses: { $exists: false } },
          { completion_rate: { $exists: false } }
        ]
      },
      {
        $set: {
          is_manually_enabled: false,
          max_responses: 1000,
          completion_rate: 0,
          average_score: 0,
          average_completion_time: 0,
          difficulty: 'medium',
          estimated_completion_rate: 0,
          quality_score: 0,
          tags: [],
          successful_responses: { $ifNull: ['$successful_responses', 0] },
          failed_responses: { $ifNull: ['$failed_responses', 0] }
        }
      }
    );

    console.log(`Migration completed. Updated ${result.modifiedCount} surveys.`);

    // Verify the migration
    const totalSurveys = await surveysCollection.countDocuments();
    console.log(`Total surveys in database: ${totalSurveys}`);

    const sampleSurveys = await surveysCollection.find({}).limit(3).toArray();
    
    console.log('\nSample surveys after migration:');
    sampleSurveys.forEach((survey, index) => {
      console.log(`\n${index + 1}. ${survey.title}`);
      console.log(`   - is_manually_enabled: ${survey.is_manually_enabled}`);
      console.log(`   - max_responses: ${survey.max_responses}`);
      console.log(`   - status: ${survey.status}`);
      console.log(`   - current_responses: ${survey.current_responses}`);
    });

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the migration
migrateSurveys();
