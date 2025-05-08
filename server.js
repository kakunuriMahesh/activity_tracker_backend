// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// require('dotenv').config();
// const { checkStreaks } = require('./cron/streak');

// const app = express();

// // Configure CORS
// const allowedOrigins = [
//   'http://localhost:19006', // Expo dev
//   'http://localhost:3000',  // Web dev (if using Expo web)
//   'https://activity-tracker-backend-paum.onrender.com',
//   'https://activity-tracker-backend-paum.onrender.com', // Replace with your deployed frontend URL
//   // Add other frontend URLs as needed
// ];

// app.use(cors({
//   origin: (origin, callback) => {
//     // Allow requests with no origin (e.g., mobile apps, Postman)
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }
//     return callback(new Error('Not allowed by CORS'));
//   },
//   methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true, // If you use cookies or auth tokens
// }));

// // Middleware to log requests for debugging
// app.use((req, res, next) => {
//   console.log(`Request: ${req.method} ${req.url} from Origin: ${req.headers.origin}`);
//   next();
// });

// app.use(express.json());

// // Verify MONGODB_URI
// if (!process.env.MONGODB_URI) {
//   console.error('Error: MONGODB_URI is not defined in .env file');
//   process.exit(1);
// }

// // Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('Connected to MongoDB'))
//   .catch((error) => {
//     console.error('MongoDB connection error:', error);
//     process.exit(1);
//   });

// // Routes
// app.use('/api/users', require('./routes/users'));
// app.use('/api/tasks', require('./routes/tasks'));
// app.use('/api/challenges', require('./routes/challenges'));
// app.use('/api/notifications', require('./routes/notifications'));

// // Schedule streak check (runs daily at midnight)
// setInterval(checkStreaks, 24 * 60 * 60 * 1000);

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// TODO: i want to fix this code with cors error

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { checkStreaks } = require('./cron/streak');

const app = express();
app.use(cors());
app.use(express.json());

// Verify MONGODB_URI
if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/notifications', require('./routes/notifications'));

// Schedule streak check (runs daily at midnight)
setInterval(checkStreaks, 24 * 60 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// FIXME: TODO: Ensure notifications route is included.

// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const userRoutes = require('./routes/users');
// const taskRoutes = require('./routes/tasks');
// const challengeRoutes = require('./routes/challenges');

// dotenv.config();
// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => console.log('Connected to MongoDB'))
//   .catch(err => console.error('MongoDB connection error:', err));

// // Routes
// app.use('/api/users', userRoutes);
// app.use('/api/tasks', taskRoutes);
// app.use('/api/challenges', challengeRoutes);

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));