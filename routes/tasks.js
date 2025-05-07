const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');

// router.post('/', async (req, res) => {
//   try {
//     const { userId, activity, distance, duration, createdAt, completed, startDate, endDate, points } = req.body;
//     const user = await User.findOne({ userId });
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }
//     const task = new Task({
//       userId,
//       activity,
//       distance,
//       duration,
//       createdAt,
//       completed,
//       startDate,
//       endDate,
//       points,
//     });
//     await task.save();
//     user.tasks.push(task._id);
//     await user.save();
//     res.status(201).json(task);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create task' });
//   }
// });

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { userId, activity, distance, startDate, endDate, points } = req.body;

    if (!userId || !activity || !distance || !startDate || !endDate || !points) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    const task = new Task({
      userId,
      activity,
      distance,
      startDate: start,
      endDate: end,
      points,
    });

    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});
// TODO: fixing start and end date of challenge
module.exports = router;


// TODO: changeing after challanges

// const express = require('express');
// const router = express.Router();
// const Task = require('../models/Task');
// const User = require('../models/User');

// // Create task
// router.post('/', async (req, res) => {
//   try {
//     const { userId, title, description, points } = req.body;
//     const user = await User.findOne({ userId });
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }
//     const task = new Task({ userId, title, description, points });
//     await task.save();
//     user.tasks.push(task._id);
//     await user.save();
//     res.status(201).json(task);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create task' });
//   }
// });

// module.exports = router;