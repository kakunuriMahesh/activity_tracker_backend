const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  // MongoDB-generated unique ID
  taskId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  // 5-digit user ID of the assignee
  userId: { type: String, required: true },
  // Activity type (e.g., "Running", "Cycling")
  activity: { type: String, required: true },
  // Distance in km (e.g., 5.0)
  distance: { type: Number, required: true },
  // Duration ("Day", "Week", "Month", "Year")
  duration: { type: String, enum: ['Day', 'Week', 'Month', 'Year'], required: true },
  // Creation timestamp
  createdAt: { type: Date, default: Date.now },
  // Completion status
  completed: { type: Boolean, default: false },
  // Start timestamp
  startDate: { type: Date, required: true },
  // End timestamp
  endDate: { type: Date, required: true },
  // Reason for skipping (if applicable)
  skippedReason: { type: String },
  // Reward points
  points: { type: Number, default: 0 },
});

// Indexes: Index on userId
TaskSchema.index({ userId: 1 });

module.exports = mongoose.model('Task', TaskSchema);




// const mongoose = require('mongoose');

// const TaskSchema = new mongoose.Schema({
//   // 5-digit user ID of the assignee
//   userId: { type: String, required: true },
//   // Task title (e.g., "Run 5km")
//   title: { type: String, required: true },
//   // Task description
//   description: String,
//   // Status ("pending", "completed", "skipped")
//   status: { type: String, enum: ['pending', 'completed', 'skipped'], default: 'pending' },
//   // Creation timestamp
//   createdAt: { type: Date, default: Date.now },
//   // Completion timestamp (if completed)
//   completedAt: Date,
//   // Reason for skipping (if applicable)
//   skippedReason: String,
//   // Reward points
//   points: { type: Number, default: 0 },
// });

// module.exports = mongoose.model('Task', TaskSchema);