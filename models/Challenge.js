const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'active', 'reject', 'skip'], default: 'pending' },
  dailyProgress: [{
    date: { type: Date, required: true },
    distance: { type: Number, default: 0 },
    url: { type: String },
    image: { type: String },
  }],
  responseReason: { type: String },
  respondedAt: { type: Date },
  lastUpdated: { type: Date },
});

const ChallengeSchema = new mongoose.Schema({
  challengeId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  creatorId: { type: String, required: true },
  assigneeIds: [{ type: String }],
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  title: { type: String, required: true },
  rules: [{ type: String, required: true }],
  exceptions: [{ type: String, required: true }],
  reward: { type: Number, required: true },
  status: { type: String, enum: ['active', 'skip', 'reject', 'finished'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  duration: { type: String }, // Changed to String, optional
  activity: { type: String, required: true }, // Added activity field
  progress: [ProgressSchema],
  winnerId: { type: String },
  completedAt: { type: Date },
});

ChallengeSchema.index({ creatorId: 1 });
ChallengeSchema.index({ assigneeIds: 1 });

module.exports = mongoose.model('Challenge', ChallengeSchema);




// TODO: may07 fixing start and end date of challenge

// const mongoose = require('mongoose');

// const ProgressSchema = new mongoose.Schema({
//   userId: { type: String, required: true },
//   status: { type: String, enum: ['pending', 'active', 'reject', 'skip'], default: 'pending' },
//   dailyProgress: [{
//     date: { type: Date, required: true },
//     distance: { type: Number, default: 0 },
//     url: { type: String },
//     image: { type: String },
//   }],
//   responseReason: { type: String },
//   respondedAt: { type: Date },
//   lastUpdated: { type: Date },
// });

// const ChallengeSchema = new mongoose.Schema({
//   challengeId: { type: mongoose.Schema.Types.ObjectId, auto: true },
//   creatorId: { type: String, required: true },
//   assigneeIds: [{ type: String }],
//   taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
//   title: { type: String, required: true },
//   rules: [{ type: String, required: true }],
//   exceptions: [{ type: String, required: true }],
//   reward: { type: Number, required: true },
//   status: { type: String, enum: ['active', 'skip', 'reject', 'finished'], default: 'active' },
//   createdAt: { type: Date, default: Date.now },
//   startDate: { type: Date, required: true },
//   endDate: { type: Date, required: true },
//   duration: { type: String, enum: ['Day', 'Week', 'Month', 'Year'], required: true },
//   progress: [ProgressSchema],
//   winnerId: { type: String },
//   completedAt: { type: Date },
// });

// ChallengeSchema.index({ creatorId: 1 });
// ChallengeSchema.index({ assigneeIds: 1 });

// module.exports = mongoose.model('Challenge', ChallengeSchema);

// FIXME: TODO: Add fields for daily progress, completion status, and winner.

// const mongoose = require('mongoose');

// const ChallengeSchema = new mongoose.Schema({
//   challengeId: { type: mongoose.Schema.Types.ObjectId, auto: true },
//   creatorId: { type: String, required: true },
//   assigneeIds: [{ type: String }],
//   taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
//   title: { type: String, required: true },
//   rules: [{ type: String, required: true }],
//   exceptions: [{ type: String, required: true }],
//   reward: { type: Number, required: true },
//   status: { type: String, enum: ['active', 'skip', 'reject', 'finished'], default: 'active' },
//   createdAt: { type: Date, default: Date.now },
//   startDate: { type: Date, required: true },
//   endDate: { type: Date, required: true },
//   duration: { type: String, enum: ['Day', 'Week', 'Month', 'Year'], required: true },
//   responseReason: { type: String },
//   progress: [{
//     userId: { type: String, required: true },
//     status: { type: String, enum: ['pending', 'active', 'reject', 'skip'], default: 'pending' },
//     distance: { type: Number, default: 0 },
//     responseReason: { type: String },
//     respondedAt: { type: Date },
//     lastUpdated: { type: Date },
//   }],
// });

// ChallengeSchema.index({ creatorId: 1 });
// ChallengeSchema.index({ assigneeIds: 1 });

// module.exports = mongoose.model('Challenge', ChallengeSchema);


// TODO: updating progress

// const mongoose = require('mongoose');

// const ChallengeSchema = new mongoose.Schema({
//   challengeId: { type: mongoose.Schema.Types.ObjectId, auto: true },
//   creatorId: { type: String, required: true },
//   assigneeIds: [{ type: String }],
//   taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
//   title: { type: String, required: true },
//   rules: [{ type: String, required: true }],
//   exceptions: [{ type: String, required: true }],
//   reward: { type: Number, required: true },
//   status: { type: String, enum: ['active', 'skip', 'reject', 'finished'], default: 'active' },
//   createdAt: { type: Date, default: Date.now },
//   startDate: { type: Date, required: true },
//   endDate: { type: Date, required: true },
//   duration: { type: String, enum: ['Day', 'Week', 'Month', 'Year'], required: true },
//   responseReason: { type: String },
// });

// ChallengeSchema.index({ creatorId: 1 });
// ChallengeSchema.index({ assigneeIds: 1 });

// module.exports = mongoose.model('Challenge', ChallengeSchema);