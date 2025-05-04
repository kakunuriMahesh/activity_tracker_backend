const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const User = require('../models/User');

async function checkStreaks() {
  try {
    const challenges = await Challenge.find({ status: 'active' });
    const today = new Date().toDateString();
    for (const challenge of challenges) {
      for (const progress of challenge.progress) {
        if (progress.status !== 'active') continue;
        const todayProgress = progress.dailyProgress.find(
          (p) => new Date(p.date).toDateString() === today
        );
        if (!todayProgress) {
          const user = await User.findOne({ userId: progress.userId });
          user.streak = 0;
          await user.save();
          console.log(`Reset streak for user ${progress.userId}`);
        }
      }
    }
    console.log('Streak check complete');
  } catch (error) {
    console.error('Streak check failed:', error);
  }
}

module.exports = { checkStreaks };