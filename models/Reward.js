const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  // MongoDB-generated unique ID
  rewardId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  // 5-digit user ID
  userId: { type: String, required: true },
  // Reference to task (if applicable)
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  // Reference to challenge (if applicable)
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
  // Points earned
  points: { type: Number, required: true },
  // Reward type ("task_completion", "challenge_completion")
  type: { type: String, enum: ['task_completion', 'challenge_completion'], required: true },
  // Creation timestamp
  createdAt: { type: Date, default: Date.now },
});

// Indexes: Index on userId
RewardSchema.index({ userId: 1 });

module.exports = mongoose.model('Reward', RewardSchema);



// const mongoose = require('mongoose');

// const RewardSchema = new mongoose.Schema({
//   // 5-digit user ID
//   userId: { type: String, required: true },
//   // Reference to task (if applicable)
//   taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
//   // Reference to challenge (if applicable)
//   challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
//   // Points earned
//   points: { type: Number, required: true },
//   // Reward type
//   type: { type: String, enum: ['task_completion', 'challenge_completion'], required: true },
//   // Creation timestamp
//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('Reward', RewardSchema);