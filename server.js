const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const path = require('path');
const cors = require('cors');
const http = require('http'); // Required to use Socket.IO with Express
const socketIo = require('socket.io'); // Real-time communication
require('dotenv').config();

const app = express();
const port = 3000;
const server = http.createServer(app);
const io = socketIo(server); // Attach Socket.IO to server

// Team names mapping
const teamNames = {
  1: 'صوفيا', 2: 'تاييس', 3: 'ايميلي', 4: 'مرتا', 5: 'سالومي',
  6: 'ارميا', 7: 'دانيال', 8: 'أشعياء', 9: 'حزقيال', 10: 'موسي'
};

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const DATABASE_NAME = 'scoreboard';
const COLLECTION_NAME = 'scores';

const client = new MongoClient(process.env.MONGO_URI, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

let collection;

// Connect to MongoDB and initialize database
async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas!");
    const db = client.db(DATABASE_NAME);
    collection = db.collection(COLLECTION_NAME);
    await initDatabase();
    setupChangeStream(); // Set up change stream for real-time updates
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    process.exit(1);
  }
}

// Function to initialize the database with default data if empty
async function initDatabase() {
  try {
    const count = await collection.countDocuments();
    if (count === 0) {
      const initialData = Array.from({ length: 10 }, (_, i) => ({
        teamNumber: i + 1,
        score: 0
      }));
      await collection.insertMany(initialData);
      console.log('Inserted initial data into MongoDB');
    }
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

// Set up a MongoDB change stream to listen for real-time updates
function setupChangeStream() {
  const changeStream = collection.watch();

  changeStream.on('change', (change) => {
    console.log('Change detected:', change);
    io.emit('databaseChange', { change });
  });

  changeStream.on('error', (error) => {
    console.error('Error in change stream:', error);
  });
}

// GET route to fetch all scores
app.get('/api/scores', async (req, res) => {
  try {
    const scores = await collection.find({}).toArray();
    const formattedScores = scores.map(row => ({
      teamNumber: row.teamNumber,
      teamName: teamNames[row.teamNumber] || `Team ${row.teamNumber}`,
      score: row.score
    }));
    res.json(formattedScores);
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ message: 'Error fetching scores' });
  }
});

// PUT route to update score for a specific team
app.put('/api/scores/:teamNumber', async (req, res) => {
  const teamNumber = parseInt(req.params.teamNumber);
  const newScore = req.body.score;

  if (isNaN(newScore) || teamNumber < 1 || teamNumber > 10) {
    return res.status(400).json({ message: 'Invalid team number or score.' });
  }

  try {
    const result = await collection.updateOne(
      { teamNumber },
      { $set: { score: newScore } },
      { upsert: true }
    );

    if (result.modifiedCount > 0) {
      res.json({ message: 'Score updated successfully!' });
    } else {
      res.status(404).json({ message: 'Team not found.' });
    }
  } catch (err) {
    console.error('Error updating score:', err);
    res.status(500).json({ message: 'Error updating score.' });
  }
});

// Start the server and connect to MongoDB
server.listen(port, async () => {
  await connectToDatabase();
  console.log(`Server is running on http://localhost:${port}`);
});
