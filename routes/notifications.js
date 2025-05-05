const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.delete('/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    await Notification.deleteOne({ _id: notificationId });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;

// FIXME:

// const express = require('express');
// const router = express.Router();
// const Notification = require('../models/Notification');

// router.patch('/:notificationId/read', async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     const notification = await Notification.findById(notificationId);
//     if (!notification) {
//       return res.status(404).json({ error: 'Notification not found' });
//     }
//     notification.read = true;
//     await notification.save();
//     res.json(notification);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to mark notification as read' });
//   }
// });

// module.exports = router;