const mongoose = require('mongoose');
require('dotenv').config();

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB for migration'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

const Challenge = require('./models/Challenge');

async function migrate() {
  try {
    const challenges = await Challenge.find({});
    for (const challenge of challenges) {
      if (!challenge.progress) {
        challenge.progress = [];
        await challenge.save();
        console.log(`Updated challenge ${challenge._id}`);
      }
    }
    console.log('Migration complete');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migrate();