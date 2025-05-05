



const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Generate 5-digit userId
async function generateUserId() {
  let userId;
  do {
    userId = Math.floor(10000 + Math.random() * 90000).toString();
  } while (await User.findOne({ userId }));
  return userId;
}

// Sign-up endpoint
router.post('/signup', async (req, res) => {
  try {
    const { email, name, authProvider, image } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const userId = await generateUserId();
    const user = new User({ userId, email, name, authProvider, image });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).populate('tasks challenges notifications');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Search users by userId or email
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $or: [
        { userId: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    }).select('userId email name');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get user notifications
router.get('/:userId/notifications', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).populate('notifications');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get user challenges
router.get('/:userId/challenges', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).populate({
      path: 'challenges',
      populate: { path: 'taskId' },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.challenges);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

router.get('/:userId/tasks', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).populate('tasks');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.patch('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completed } = req.body;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    task.completed = completed;
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// FIXME:
router.get('/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId }).populate('challenges');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const challenges = await Challenge.find({
      $or: [{ creatorId: userId }, { assigneeIds: userId }],
    });
    res.json({
      name: user.name,
      email: user.email,
      userId: user.userId,
      streak: user.streak,
      challenges,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
module.exports = router;


// TODO: adding login routes

// const express = require('express');
// const router = express.Router();
// const User = require('../models/User');

// // Generate 5-digit userId
// async function generateUserId() {
//   let userId;
//   do {
//     userId = Math.floor(10000 + Math.random() * 90000).toString();
//   } while (await User.findOne({ userId }));
//   return userId;
// }

// // Sign-up endpoint
// router.post('/', async (req, res) => {
//   try {
//     const { email, name, authProvider, image } = req.body;
//     if (await User.findOne({ email })) {
//       return res.status(400).json({ error: 'Email already exists' });
//     }
//     const userId = await generateUserId();
//     const user = new User({ userId, email, name, authProvider, image });
//     await user.save();
//     res.status(201).json(user);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create user' });
//   }
// });

// // Search users by userId or email
// router.get('/search', async (req, res) => {
//   try {
//     const { query } = req.query;
//     const users = await User.find({
//       $or: [
//         { userId: { $regex: query, $options: 'i' } },
//         { email: { $regex: query, $options: 'i' } },
//       ],
//     }).select('userId email name');
//     res.json(users);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to search users' });
//   }
// });

// // Get user notifications
// router.get('/:userId/notifications', async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const user = await User.findOne({ userId }).populate('notifications');
//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }
//     res.json(user.notifications);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch notifications' });
//   }
// });

// module.exports = router;