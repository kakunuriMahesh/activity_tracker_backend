const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  notificationId: { type: mongoose.Schema.Types.ObjectId, auto: true },
  userId: { type: String, required: true },
  type: { type: String, required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', NotificationSchema);

// FIXME: TODO: Add read status

// const mongoose = require('mongoose');
// const NotificationSchema = new mongoose.Schema({
//   notificationId: { type: mongoose.Schema.Types.ObjectId, auto: true },
//   userId: { type: String, required: true },
//   type: {
//     type: String,
//     enum: ['challenge_received', 'challenge_accepted', 'challenge_rejected', 'challenge_skipped'],
//     required: true,
//   },
//   challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
//   message: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
//   read: { type: Boolean, default: false },
// });

// NotificationSchema.index({ userId: 1 });

// module.exports = mongoose.model('Notification', NotificationSchema);

