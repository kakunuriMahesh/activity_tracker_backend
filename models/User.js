
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  authProvider: { type: String, required: true },
  image: { type: String },
  streak: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  rewards: { type: Number, default: 0 },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  challenges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
  notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);

// FIXME: TODO: Add fields for rewards and streak tracking.

// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//   userId: { type: String, required: true, unique: true },
//   email: { type: String, required: true, unique: true },
//   name: { type: String, required: true },
//   authProvider: { type: String, enum: ['google', 'manual'], required: true },
//   image: { type: String },
//   createdAt: { type: Date, default: Date.now },
//   streak: { type: Number, default: 0 },
//   totalPoints: { type: Number, default: 0 },
//   tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
//   challenges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
//   notifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification' }],
// });

// UserSchema.index({ userId: 1 }, { unique: true });
// UserSchema.index({ email: 1 }, { unique: true });

// module.exports = mongoose.model('User', UserSchema);

