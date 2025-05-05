const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Task = require('../models/Task');

router.post('/', async (req, res) => {
  try {
    const {
      creatorId,
      assigneeIds,
      taskId,
      title,
      rules,
      exceptions,
      reward,
      status,
      startDate,
      duration,
    } = req.body;
    const creator = await User.findOne({ userId: creatorId });
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    const start = new Date(startDate);
    let endDate;
    switch (duration) {
      case 'Day':
        endDate = new Date(start.setDate(start.getDate() + 1));
        break;
      case 'Week':
        endDate = new Date(start.setDate(start.getDate() + 7));
        break;
      case 'Month':
        endDate = new Date(start.setMonth(start.getMonth() + 1));
        break;
      case 'Year':
        endDate = new Date(start.setFullYear(start.getFullYear() + 1));
        break;
      default:
        return res.status(400).json({ error: 'Invalid duration' });
    }
    const challenge = new Challenge({
      creatorId,
      assigneeIds,
      taskId,
      title,
      rules,
      exceptions,
      reward,
      status: status || 'active',
      createdAt: new Date(),
      startDate,
      endDate,
      duration,
      progress: [],
    });
    await challenge.save();
    creator.challenges.push(challenge._id);
    await creator.save();
    res.status(201).json(challenge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

router.patch('/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { assigneeIds } = req.body;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    challenge.assigneeIds = assigneeIds;
    await challenge.save();
    for (const assigneeId of assigneeIds) {
      const assignee = await User.findOne({ userId: assigneeId });
      if (assignee) {
        if (!assignee.challenges.includes(challenge._id)) {
          assignee.challenges.push(challenge._id);
          await assignee.save();
        }
        const notification = new Notification({
          userId: assigneeId,
          type: 'challenge_received',
          challengeId: challenge._id,
          message: `You received a "${challenge.title}" challenge!`,
          read: false,
        });
        await notification.save();
        assignee.notifications.push(notification._id);
        await assignee.save();
      }
    }
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update challenge' });
  }
});

router.get('/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const challenge = await Challenge.findById(challengeId).populate('taskId');
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    const participants = await Promise.all(
      challenge.assigneeIds.map(async (userId) => {
        const user = await User.findOne({ userId }).select('name');
        const progress = challenge.progress.find((p) => p.userId === userId) || {};
        return {
          userId,
          name: user ? user.name : 'Unknown',
          status: progress.status || 'pending',
          dailyProgress: progress.dailyProgress || [],
          responseReason: progress.responseReason || '',
        };
      })
    );
    res.json({ ...challenge._doc, participants });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch challenge' });
  }
});

router.post('/:challengeId/respond', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId, response, responseReason } = req.body;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    if (!challenge.assigneeIds.includes(userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    let progressIndex = challenge.progress.findIndex((p) => p.userId === userId);
    const progressEntry = {
      userId,
      status: response === 'agree' ? 'active' : response,
      dailyProgress: [],
      responseReason: response === 'reject' || response === 'skip' ? responseReason : undefined,
      respondedAt: new Date(),
      lastUpdated: new Date(),
    };
    if (progressIndex >= 0) {
      challenge.progress[progressIndex] = progressEntry;
    } else {
      challenge.progress.push(progressEntry);
    }
    const assignee = await User.findOne({ userId });
    if (response === 'agree') {
      if (!assignee.challenges.includes(challengeId)) {
        assignee.challenges.push(challengeId);
        await assignee.save();
      }
    } else if (response === 'reject' || response === 'skip') {
      assignee.challenges = assignee.challenges.filter(
        (id) => id.toString() !== challengeId
      );
      await assignee.save();
      const notification = await Notification.findOne({
        userId,
        challengeId,
        type: 'challenge_received',
      });
      if (notification) {
        await Notification.deleteOne({ _id: notification._id });
        assignee.notifications = assignee.notifications.filter(
          (id) => id.toString() !== notification._id.toString()
        );
        await assignee.save();
      }
    }
    await challenge.save();
    const creator = await User.findOne({ userId: challenge.creatorId });
    if (creator && assignee) {
      const notification = new Notification({
        userId: challenge.creatorId,
        type: `challenge_${response === 'agree' ? 'accepted' : response}`,
        challengeId: challenge._id,
        message: `${assignee.name} ${
          response === 'agree' ? 'accepted' : response + 'ed'
        } your "${challenge.title}" challenge${
          responseReason ? `: ${responseReason}` : ''
        }`,
        read: false,
      });
      await notification.save();
      creator.notifications.push(notification._id);
      await creator.save();
    }
    res.json(challenge);
  } catch (error) {
    console.error('Error in respond endpoint:', error);
    res.status(500).json({ error: 'Failed to respond to challenge' });
  }
});

router.post('/:challengeId/progress', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId, distance, url, image, date } = req.body;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    if (!challenge.assigneeIds.includes(userId) && challenge.creatorId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    let progressIndex = challenge.progress.findIndex((p) => p.userId === userId);
    if (progressIndex < 0) {
      challenge.progress.push({
        userId,
        status: 'active',
        dailyProgress: [],
        lastUpdated: new Date(),
      });
      progressIndex = challenge.progress.length - 1;
    }
    const dailyProgressIndex = challenge.progress[progressIndex].dailyProgress.findIndex(
      (p) => new Date(p.date).toDateString() === new Date(date).toDateString()
    );
    const progressEntry = { date: new Date(date), distance, url, image };
    if (dailyProgressIndex >= 0) {
      challenge.progress[progressIndex].dailyProgress[dailyProgressIndex] = progressEntry;
    } else {
      challenge.progress[progressIndex].dailyProgress.push(progressEntry);
    }
    challenge.progress[progressIndex].lastUpdated = new Date();
    const task = await Task.findById(challenge.taskId);
    const totalDistance = challenge.progress[progressIndex].dailyProgress.reduce(
      (sum, p) => sum + p.distance,
      0
    );
    if (totalDistance >= task.distance && !challenge.winnerId) {
      challenge.winnerId = userId;
      challenge.completedAt = new Date();
      challenge.status = 'finished';
      const user = await User.findOne({ userId });
      user.rewards += challenge.reward;
      user.streak += 1;
      await user.save();
    }
    await challenge.save();
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

router.patch('/:challengeId/edit', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId, title, rules, exceptions, reward, startDate, duration } = req.body;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    if (challenge.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can edit this challenge' });
    }
    const creationTime = new Date(challenge.createdAt);
    const currentTime = new Date();
    const timeDiff = (currentTime - creationTime) / (1000 * 60 * 60); // Hours
    if (timeDiff > 24) {
      return res.status(403).json({ error: 'Editing is only allowed within 24 hours of creation' });
    }
    challenge.title = title || challenge.title;
    challenge.rules = rules || challenge.rules;
    challenge.exceptions = exceptions || challenge.exceptions;
    challenge.reward = reward || challenge.reward;
    if (startDate && duration) {
      challenge.startDate = new Date(startDate);
      challenge.duration = duration;
      let endDate;
      const start = new Date(startDate);
      switch (duration) {
        case 'Day':
          endDate = new Date(start.setDate(start.getDate() + 1));
          break;
        case 'Week':
          endDate = new Date(start.setDate(start.getDate() + 7));
          break;
        case 'Month':
          endDate = new Date(start.setMonth(start.getMonth() + 1));
          break;
        case 'Year':
          endDate = new Date(start.setFullYear(start.getFullYear() + 1));
          break;
        default:
          return res.status(400).json({ error: 'Invalid duration' });
      }
      challenge.endDate = endDate;
    }
    await challenge.save();
    res.json(challenge);
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit challenge' });
  }
});

router.delete('/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { userId } = req.body;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    if (challenge.creatorId !== userId) {
      return res.status(403).json({ error: 'Only the creator can delete this challenge' });
    }
    await Notification.deleteMany({ challengeId });
    const users = await User.find({ challenges: challengeId });
    for (const user of users) {
      user.challenges = user.challenges.filter((id) => id.toString() !== challengeId);
      user.notifications = user.notifications.filter(
        (id) => !Notification.findById(id).challengeId?.equals(challengeId)
      );
      await user.save();
    }
    await Challenge.deleteOne({ _id: challengeId });
    res.json({ message: 'Challenge deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete challenge' });
  }
});

module.exports = router;

// FIXME:

// const express = require('express');
// const router = express.Router();
// const Challenge = require('../models/Challenge');
// const Notification = require('../models/Notification');
// const User = require('../models/User');

// router.post('/', async (req, res) => {
//   try {
//     const {
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status,
//       startDate,
//       duration,
//     } = req.body;
//     const creator = await User.findOne({ userId: creatorId });
//     if (!creator) {
//       return res.status(404).json({ error: 'Creator not found' });
//     }
//     // Calculate endDate based on duration
//     const start = new Date(startDate);
//     let endDate;
//     switch (duration) {
//       case 'Day':
//         endDate = new Date(start.setDate(start.getDate() + 1));
//         break;
//       case 'Week':
//         endDate = new Date(start.setDate(start.getDate() + 7));
//         break;
//       case 'Month':
//         endDate = new Date(start.setMonth(start.getMonth() + 1));
//         break;
//       case 'Year':
//         endDate = new Date(start.setFullYear(start.getFullYear() + 1));
//         break;
//       default:
//         return res.status(400).json({ error: 'Invalid duration' });
//     }
//     const challenge = new Challenge({
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status: status || 'active',
//       createdAt: new Date(),
//       startDate,
//       endDate,
//       duration,
//       progress: [],
//     });
//     await challenge.save();
//     creator.challenges.push(challenge._id);
//     await creator.save();
//     res.status(201).json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create challenge' });
//   }
// });

// router.patch('/:challengeId', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { assigneeIds } = req.body;
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     challenge.assigneeIds = assigneeIds;
//     await challenge.save();
//     for (const assigneeId of assigneeIds) {
//       const assignee = await User.findOne({ userId: assigneeId });
//       if (assignee) {
//         if (!assignee.challenges.includes(challenge._id)) {
//           assignee.challenges.push(challenge._id);
//           await assignee.save();
//         }
//         const notification = new Notification({
//           userId: assigneeId,
//           type: 'challenge_received',
//           challengeId: challenge._id,
//           message: `You received a "${challenge.title}" challenge!`,
//           read: false,
//         });
//         await notification.save();
//         assignee.notifications.push(notification._id);
//         await assignee.save();
//       }
//     }
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update challenge' });
//   }
// });

// router.get('/:challengeId', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const challenge = await Challenge.findById(challengeId).populate('taskId');
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     const participants = await Promise.all(
//       challenge.assigneeIds.map(async (userId) => {
//         const user = await User.findOne({ userId }).select('name');
//         const progress = challenge.progress.find((p) => p.userId === userId) || {};
//         return {
//           userId,
//           name: user ? user.name : 'Unknown',
//           status: progress.status || 'pending',
//           dailyProgress: progress.dailyProgress || [],
//           responseReason: progress.responseReason || '',
//         };
//       })
//     );
//     res.json({ ...challenge._doc, participants });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch challenge' });
//   }
// });

// router.post('/:challengeId/respond', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { userId, response, responseReason } = req.body;
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     if (!challenge.assigneeIds.includes(userId)) {
//       return res.status(403).json({ error: 'Not authorized' });
//     }
//     let progressIndex = challenge.progress.findIndex((p) => p.userId === userId);
//     const progressEntry = {
//       userId,
//       status: response === 'agree' ? 'active' : response,
//       dailyProgress: [],
//       responseReason: response === 'reject' || response === 'skip' ? responseReason : undefined,
//       respondedAt: new Date(),
//       lastUpdated: new Date(),
//     };
//     if (progressIndex >= 0) {
//       challenge.progress[progressIndex] = progressEntry;
//     } else {
//       challenge.progress.push(progressEntry);
//     }
//     if (response === 'reject' || response === 'skip') {
//       const assignee = await User.findOne({ userId });
//       if (assignee) {
//         assignee.challenges = assignee.challenges.filter(
//           (id) => id.toString() !== challengeId
//         );
//         await assignee.save();
//       }
//       // Remove notification
//       const notification = await Notification.findOne({
//         userId,
//         challengeId,
//         type: 'challenge_received',
//       });
//       if (notification) {
//         await Notification.deleteOne({ _id: notification._id });
//         const assignee = await User.findOne({ userId });
//         assignee.notifications = assignee.notifications.filter(
//           (id) => id.toString() !== notification._id.toString()
//         );
//         await assignee.save();
//       }
//     }
//     await challenge.save();
//     // Notify creator
//     const creator = await User.findOne({ userId: challenge.creatorId });
//     const assignee = await User.findOne({ userId });
//     if (creator && assignee) {
//       const notification = new Notification({
//         userId: challenge.creatorId,
//         type: `challenge_${response === 'agree' ? 'accepted' : response}`,
//         challengeId: challenge._id,
//         message: `${assignee.name} ${
//           response === 'agree' ? 'accepted' : response + 'ed'
//         } your "${challenge.title}" challenge${
//           responseReason ? `: ${responseReason}` : ''
//         }`,
//         read: false,
//       });
//       await notification.save();
//       creator.notifications.push(notification._id);
//       await creator.save();
//     }
//     res.json(challenge);
//   } catch (error) {
//     console.error('Error in respond endpoint:', error);
//     res.status(500).json({ error: 'Failed to respond to challenge' });
//   }
// });

// router.post('/:challengeId/progress', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { userId, distance, url, image, date } = req.body;
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     if (!challenge.assigneeIds.includes(userId) && challenge.creatorId !== userId) {
//       return res.status(403).json({ error: 'Not authorized' });
//     }
//     let progressIndex = challenge.progress.findIndex((p) => p.userId === userId);
//     if (progressIndex < 0) {
//       challenge.progress.push({
//         userId,
//         status: 'active',
//         dailyProgress: [],
//         lastUpdated: new Date(),
//       });
//       progressIndex = challenge.progress.length - 1;
//     }
//     const dailyProgressIndex = challenge.progress[progressIndex].dailyProgress.findIndex(
//       (p) => new Date(p.date).toDateString() === new Date(date).toDateString()
//     );
//     const progressEntry = { date: new Date(date), distance, url, image };
//     if (dailyProgressIndex >= 0) {
//       challenge.progress[progressIndex].dailyProgress[dailyProgressIndex] = progressEntry;
//     } else {
//       challenge.progress[progressIndex].dailyProgress.push(progressEntry);
//     }
//     challenge.progress[progressIndex].lastUpdated = new Date();
//     // Check completion
//     const task = await Task.findById(challenge.taskId);
//     const totalDistance = challenge.progress[progressIndex].dailyProgress.reduce(
//       (sum, p) => sum + p.distance,
//       0
//     );
//     if (totalDistance >= task.distance && !challenge.winnerId) {
//       challenge.winnerId = userId;
//       challenge.completedAt = new Date();
//       challenge.status = 'finished';
//       const user = await User.findOne({ userId });
//       user.rewards += challenge.reward;
//       user.streak += 1;
//       await user.save();
//     }
//     await challenge.save();
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update progress' });
//   }
// });

// module.exports = router;

// TODO: Fix response handling, add progress updates, and implement completion logic.

// const express = require('express');
// const router = express.Router();
// const Challenge = require('../models/Challenge');
// const Notification = require('../models/Notification');
// const User = require('../models/User');

// router.post('/', async (req, res) => {
//   try {
//     const {
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status,
//       createdAt,
//       startDate,
//       endDate,
//       duration,
//     } = req.body;
//     const creator = await User.findOne({ userId: creatorId });
//     if (!creator) {
//       return res.status(404).json({ error: 'Creator not found' });
//     }
//     const challenge = new Challenge({
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status: status || 'active',
//       createdAt,
//       startDate,
//       endDate,
//       duration,
//       progress: [], // Initialize progress array
//     });
//     await challenge.save();
//     creator.challenges.push(challenge._id);
//     await creator.save();
//     res.status(201).json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create challenge' });
//   }
// });

// router.patch('/:challengeId', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { assigneeIds, creatorId } = req.body;
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     challenge.assigneeIds = assigneeIds;
//     await challenge.save();
//     for (const assigneeId of assigneeIds) {
//       const assignee = await User.findOne({ userId: assigneeId });
//       if (assignee) {
//         if (!assignee.challenges.includes(challenge._id)) {
//           assignee.challenges.push(challenge._id);
//           await assignee.save();
//         }
//         const notification = new Notification({
//           userId: assigneeId,
//           type: 'challenge_received',
//           challengeId: challenge._id,
//           message: `You received a "${challenge.title}" challenge from ${creatorId}!`,
//         });
//         await notification.save();
//         assignee.notifications.push(notification._id);
//         await assignee.save();
//       }
//     }
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update challenge' });
//   }
// });

// router.get('/:challengeId', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const challenge = await Challenge.findById(challengeId).populate('taskId');
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     // Fetch participant details
//     const participants = await Promise.all(
//       challenge.assigneeIds.map(async (userId) => {
//         const user = await User.findOne({ userId }).select('name');
//         return {
//           userId,
//           name: user ? user.name : 'Unknown',
//           status: challenge.progress.find((p) => p.userId === userId)?.status || 'pending',
//           progress: challenge.progress.find((p) => p.userId === userId)?.distance || 0,
//           responseReason: challenge.progress.find((p) => p.userId === userId)?.responseReason || '',
//         };
//       })
//     );
//     res.json({ ...challenge._doc, participants });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch challenge' });
//   }
// });

// router.post('/:challengeId/respond', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { userId, response, responseReason } = req.body; // response: 'agree', 'reject', 'skip'
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     if (!challenge.assigneeIds.includes(userId)) {
//       return res.status(403).json({ error: 'Not authorized' });
//     }
//     // Update progress array for the user
//     const progressIndex = challenge.progress.findIndex((p) => p.userId === userId);
//     const progressEntry = {
//       userId,
//       status: response === 'agree' ? 'active' : response,
//       distance: 0,
//       responseReason: response === 'reject' || response === 'skip' ? responseReason : undefined,
//       respondedAt: new Date(),
//     };
//     if (progressIndex >= 0) {
//       challenge.progress[progressIndex] = progressEntry;
//     } else {
//       challenge.progress.push(progressEntry);
//     }
//     // Remove from assignee's challenges if rejected or skipped
//     if (response === 'reject' || response === 'skip') {
//       const assignee = await User.findOne({ userId });
//       if (assignee) {
//         assignee.challenges = assignee.challenges.filter(
//           (id) => id.toString() !== challengeId
//         );
//         await assignee.save();
//       }
//     }
//     await challenge.save();
//     // Notify creator
//     const creator = await User.findOne({ userId: challenge.creatorId });
//     const assignee = await User.findOne({ userId });
//     if (creator && assignee) {
//       const notification = new Notification({
//         userId: challenge.creatorId,
//         type: `challenge_${response === 'agree' ? 'accepted' : response}`,
//         challengeId: challenge._id,
//         message: `${assignee.name} ${
//           response === 'agree' ? 'accepted' : response + 'ed'
//         } your "${challenge.title}" challenge${
//           responseReason ? `: ${responseReason}` : ''
//         }`,
//       });
//       await notification.save();
//       creator.notifications.push(notification._id);
//       await creator.save();
//     }
//     res.json(challenge);
//   } catch (error) {
//     console.error('Error in respond endpoint:', error);
//     res.status(500).json({ error: 'Failed to respond to challenge' });
//   }
// });

// router.post('/:challengeId/progress', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { userId, distance } = req.body;
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     if (!challenge.assigneeIds.includes(userId) && challenge.creatorId !== userId) {
//       return res.status(403).json({ error: 'Not authorized' });
//     }
//     const progressIndex = challenge.progress.findIndex((p) => p.userId === userId);
//     if (progressIndex >= 0) {
//       challenge.progress[progressIndex].distance += distance;
//       challenge.progress[progressIndex].lastUpdated = new Date();
//     } else {
//       challenge.progress.push({
//         userId,
//         status: 'active',
//         distance,
//         lastUpdated: new Date(),
//       });
//     }
//     await challenge.save();
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update progress' });
//   }
// });

// module.exports = router;

// TODO: working but fix the reject and skip.

// const express = require('express');
// const router = express.Router();
// const Challenge = require('../models/Challenge');
// const Notification = require('../models/Notification');
// const User = require('../models/User');

// router.post('/', async (req, res) => {
//   try {
//     const {
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status,
//       createdAt,
//       startDate,
//       endDate,
//       duration,
//     } = req.body;
//     const creator = await User.findOne({ userId: creatorId });
//     if (!creator) {
//       return res.status(404).json({ error: 'Creator not found' });
//     }
//     const challenge = new Challenge({
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status: status || 'active', // Ensure lowercase
//       createdAt,
//       startDate,
//       endDate,
//       duration,
//     });
//     await challenge.save();
//     creator.challenges.push(challenge._id);
//     await creator.save();
//     res.status(201).json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create challenge' });
//   }
// });

// router.patch('/:challengeId', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { assigneeIds, creatorId } = req.body;
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     challenge.assigneeIds = assigneeIds;
//     await challenge.save();
//     // Update assignees' challenges arrays and create notifications
//     for (const assigneeId of assigneeIds) {
//       const assignee = await User.findOne({ userId: assigneeId });
//       if (assignee) {
//         if (!assignee.challenges.includes(challenge._id)) {
//           assignee.challenges.push(challenge._id);
//           await assignee.save();
//         }
//         const notification = new Notification({
//           userId: assigneeId,
//           type: 'challenge_received',
//           challengeId: challenge._id,
//           message: `You received a "${challenge.title}" challenge from ${creatorId}!`,
//         });
//         await notification.save();
//         assignee.notifications.push(notification._id);
//         await assignee.save();
//       }
//     }
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update challenge' });
//   }
// });

// router.get('/:challengeId', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const challenge = await Challenge.findById(challengeId).populate('taskId');
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch challenge' });
//   }
// });

// // Respond to challenge (agree, reject, skip)
// router.post('/:challengeId/respond', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { userId, response, responseReason } = req.body; // response: 'agree', 'reject', 'skip'
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     if (!challenge.assigneeIds.includes(userId)) {
//       return res.status(403).json({ error: 'Not authorized' });
//     }
//     // Update challenge status
//     challenge.status = response === 'agree' ? 'active' : response; // Ensure lowercase
//     if (response === 'reject' || response === 'skip') {
//       challenge.responseReason = responseReason;
//       // Remove from assignee's challenges if rejected or skipped
//       const assignee = await User.findOne({ userId });
//       if (assignee) {
//         assignee.challenges = assignee.challenges.filter(
//           (id) => id.toString() !== challengeId
//         );
//         await assignee.save();
//       }
//     }
//     challenge.respondedAt = new Date();
//     await challenge.save();
//     // Notify creator
//     const creator = await User.findOne({ userId: challenge.creatorId });
//     const assignee = await User.findOne({ userId });
//     if (creator && assignee) {
//       const notification = new Notification({
//         userId: challenge.creatorId,
//         type: `challenge_${response === 'agree' ? 'accepted' : response}`,
//         challengeId: challenge._id,
//         message: `${assignee.name} ${
//           response === 'agree' ? 'accepted' : response + 'ed'
//         } your "${challenge.title}" challenge${
//           responseReason ? `: ${responseReason}` : ''
//         }`,
//       });
//       await notification.save();
//       creator.notifications.push(notification._id);
//       await creator.save();
//     }
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to respond to challenge' });
//   }
// });

// module.exports = router;


// TODO: (agree, reject, skip) and notify the creator.

// const express = require('express');
// const router = express.Router();
// const Challenge = require('../models/Challenge');
// const Notification = require('../models/Notification');
// const User = require('../models/User');

// router.post('/', async (req, res) => {
//   try {
//     const {
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status,
//       createdAt,
//       startDate,
//       endDate,
//       duration,
//     } = req.body;
//     const creator = await User.findOne({ userId: creatorId });
//     if (!creator) {
//       return res.status(404).json({ error: 'Creator not found' });
//     }
//     const challenge = new Challenge({
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status,
//       createdAt,
//       startDate,
//       endDate,
//       duration,
//     });
//     await challenge.save();
//     creator.challenges.push(challenge._id);
//     await creator.save();
//     res.status(201).json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create challenge' });
//   }
// });

// router.patch('/:challengeId', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { assigneeIds, creatorId } = req.body;
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     challenge.assigneeIds = assigneeIds;
//     await challenge.save();
//     // Update assignees' challenges arrays and create notifications
//     for (const assigneeId of assigneeIds) {
//       const assignee = await User.findOne({ userId: assigneeId });
//       if (assignee) {
//         if (!assignee.challenges.includes(challenge._id)) {
//           assignee.challenges.push(challenge._id);
//           await assignee.save();
//         }
//         const notification = new Notification({
//           userId: assigneeId,
//           type: 'challenge_received',
//           challengeId: challenge._id,
//           message: `You received a "${challenge.title}" challenge from ${creatorId}!`,
//         });
//         await notification.save();
//         assignee.notifications.push(notification._id);
//         await assignee.save();
//       }
//     }
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update challenge' });
//   }
// });

// // Respond to challenge (agree, reject, skip)
// router.post('/:challengeId/respond', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { userId, response, responseReason } = req.body; // response: 'agree', 'reject', 'skip'
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     if (!challenge.assigneeIds.includes(userId)) {
//       return res.status(403).json({ error: 'Not authorized' });
//     }
//     // Update challenge status
//     challenge.status = response === 'agree' ? 'active' : response; // 'active', 'reject', 'skip'
//     if (response === 'reject' || response === 'skip') {
//       challenge.responseReason = responseReason;
//       // Remove from assignee's challenges if rejected or skipped
//       const assignee = await User.findOne({ userId });
//       if (assignee) {
//         assignee.challenges = assignee.challenges.filter(
//           (id) => id.toString() !== challengeId
//         );
//         await assignee.save();
//       }
//     }
//     challenge.respondedAt = new Date();
//     await challenge.save();
//     // Notify creator
//     const creator = await User.findOne({ userId: challenge.creatorId });
//     const assignee = await User.findOne({ userId });
//     if (creator && assignee) {
//       const notification = new Notification({
//         userId: challenge.creatorId,
//         type: `challenge_${response === 'agree' ? 'accepted' : response}`,
//         challengeId: challenge._id,
//         message: `${assignee.name} ${
//           response === 'agree' ? 'accepted' : response + 'ed'
//         } your "${challenge.title}" challenge${
//           responseReason ? `: ${responseReason}` : ''
//         }`,
//       });
//       await notification.save();
//       creator.notifications.push(notification._id);
//       await creator.save();
//     }
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to respond to challenge' });
//   }
// });

// module.exports = router;


// TODO: Handle challenge responses (agree, reject, skip) and notify the creator.

// const express = require('express');
// const router = express.Router();
// const Challenge = require('../models/Challenge');
// const Notification = require('../models/Notification');
// const User = require('../models/User');

// router.post('/', async (req, res) => {
//   try {
//     const {
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status,
//       createdAt,
//       startDate,
//       endDate,
//       duration,
//     } = req.body;
//     const creator = await User.findOne({ userId: creatorId });
//     if (!creator) {
//       return res.status(404).json({ error: 'Creator not found' });
//     }
//     const challenge = new Challenge({
//       creatorId,
//       assigneeIds,
//       taskId,
//       title,
//       rules,
//       exceptions,
//       reward,
//       status,
//       createdAt,
//       startDate,
//       endDate,
//       duration,
//     });
//     await challenge.save();
//     creator.challenges.push(challenge._id);
//     await creator.save();
//     res.status(201).json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create challenge' });
//   }
// });

// router.patch('/:challengeId', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { assigneeIds, creatorId } = req.body;
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     challenge.assigneeIds = assigneeIds;
//     await challenge.save();
//     // Create notifications for assignees
//     for (const assigneeId of assigneeIds) {
//       const assignee = await User.findOne({ userId: assigneeId });
//       if (assignee) {
//         const notification = new Notification({
//           userId: assigneeId,
//           type: 'challenge_received',
//           challengeId: challenge._id,
//           message: `You received a "${challenge.title}" challenge from ${creatorId}!`,
//         });
//         await notification.save();
//         assignee.notifications.push(notification._id);
//         await assignee.save();
//       }
//     }
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to update challenge' });
//   }
// });

// module.exports = router;


// TODO: adding challenge routes

// const express = require('express');
// const router = express.Router();
// const Challenge = require('../models/Challenge');
// const Notification = require('../models/Notification');
// const User = require('../models/User');

// // Create challenge
// router.post('/', async (req, res) => {
//   try {
//     const { creatorId, recipientEmail, title, description, points } = req.body;
//     // Resolve recipient email to userId
//     const recipient = await User.findOne({ email: recipientEmail });
//     if (!recipient) {
//       return res.status(404).json({ error: 'Recipient not found' });
//     }
//     const creator = await User.findOne({ userId: creatorId });
//     if (!creator) {
//       return res.status(404).json({ error: 'Creator not found' });
//     }
//     const challenge = new Challenge({
//       creatorId,
//       recipientId: recipient.userId,
//       title,
//       description,
//       points,
//     });
//     await challenge.save();
//     // Add to users' challenges
//     creator.challenges.push(challenge._id);
//     recipient.challenges.push(challenge._id);
//     await creator.save();
//     await recipient.save();
//     // Create notification for recipient
//     const notification = new Notification({
//       userId: recipient.userId,
//       type: 'challenge_received',
//       challengeId: challenge._id,
//       message: `You received a "${title}" challenge from ${creator.name}!`,
//     });
//     await notification.save();
//     recipient.notifications.push(notification._id);
//     await recipient.save();
//     res.status(201).json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to create challenge' });
//   }
// });

// // Respond to challenge (accept/reject/skip)
// router.patch('/:challengeId/respond', async (req, res) => {
//   try {
//     const { challengeId } = req.params;
//     const { userId, status, responseReason } = req.body;
//     const challenge = await Challenge.findById(challengeId);
//     if (!challenge) {
//       return res.status(404).json({ error: 'Challenge not found' });
//     }
//     if (challenge.recipientId !== userId) {
//       return res.status(403).json({ error: 'Not authorized' });
//     }
//     challenge.status = status;
//     challenge.respondedAt = new Date();
//     if (status === 'rejected' || status === 'skipped') {
//       challenge.responseReason = responseReason;
//     }
//     await challenge.save();
//     // Create notification for creator
//     const creator = await User.findOne({ userId: challenge.creatorId });
//     const recipient = await User.findOne({ userId: userId });
//     if (status === 'rejected' || status === 'skipped') {
//       const notification = new Notification({
//         userId: challenge.creatorId,
//         type: `challenge_${status}`,
//         challengeId: challenge._id,
//         message: `${recipient.name} ${status} your "${challenge.title}" challenge: ${responseReason || 'No reason provided'}`,
//       });
//       await notification.save();
//       creator.notifications.push(notification._id);
//       await creator.save();
//       // Remove from recipient's challenges if rejected/skipped
//       recipient.challenges = recipient.challenges.filter(id => id.toString() !== challengeId);
//       await recipient.save();
//     } else if (status === 'accepted') {
//       const notification = new Notification({
//         userId: challenge.creatorId,
//         type: 'challenge_accepted',
//         challengeId: challenge._id,
//         message: `${recipient.name} accepted your "${challenge.title}" challenge!`,
//       });
//       await notification.save();
//       creator.notifications.push(notification._id);
//       await creator.save();
//     }
//     res.json(challenge);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to respond to challenge' });
//   }
// });

// module.exports = router;