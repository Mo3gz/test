const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // CORS support for development
const app = express();
const port = 3000;

const teamNames = {
  1: 'Sofia',
  2: 'John',
  3: 'Sarah',
  4: 'Mike',
  5: 'a',
  6: 'b',
  7: 'c',
  8: 'd',
  9: 'e',
  10: 'f'
};
const scoresFilePath = path.join('D:/home', 'scores.txt');

// Function to initialize scores file with default data if it doesn't exist
const initializeScoresFile = () => {
  if (!fs.existsSync(scoresFilePath)) {
    const initialScores = Array.from({ length: 10 }, (_, i) => ({
      teamNumber: i + 1,
      score: 0
    }));
    try {
      fs.writeFileSync(scoresFilePath, JSON.stringify(initialScores, null, 2));
      console.log('Initialized scores file with default data');
    } catch (error) {
      console.error('Error initializing scores file:', error);
    }
  }
};

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors()); // Enable CORS for development

// Helper function to read scores from file
const readScores = () => {
  const data = fs.readFileSync(scoresFilePath, 'utf-8');
  return JSON.parse(data);
};

// Helper function to write scores to file
const writeScores = (scores) => {
  fs.writeFileSync(scoresFilePath, JSON.stringify(scores, null, 2));
};

// Get all scores
app.get('/api/scores', (req, res) => {
  try {
    const scores = readScores();
    const scoresArr = scores.map(row => ({
      teamNumber: row.teamNumber,
      teamName: teamNames[row.teamNumber] || `Team ${row.teamNumber}`,
      score: row.score
    }));
    res.json(scoresArr);
  } catch (error) {
    console.error('Error reading scores:', error);
    res.status(500).json({ message: 'Error fetching scores' });
  }
});

// Update a team's score
app.put('/api/scores/:teamNumber', (req, res) => {
  const teamNumber = parseInt(req.params.teamNumber);
  const newScore = req.body.score;

  if (isNaN(newScore) || teamNumber < 1 || teamNumber > 10) {
    return res.status(400).json({ message: "Invalid team number or score." });
  }

  try {
    const scores = readScores();
    const team = scores.find(t => t.teamNumber === teamNumber);

    if (team) {
      team.score = newScore;
      writeScores(scores);
      res.json({ message: "Score updated successfully!" });
    } else {
      res.status(404).json({ message: "Team not found." });
    }
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ message: "Error updating score." });
  }
});

// Serve static files (public directory) for frontend
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
