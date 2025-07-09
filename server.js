 
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.static('public'));

const RAPIDAPI_HOST = 'cricbuzz-cricket.p.rapidapi.com';
const API_BASE_URL = `https://${RAPIDAPI_HOST}`;

const headers = {
  'x-rapidapi-key': process.env.RAPIDAPI_KEY,
  'x-rapidapi-host': RAPIDAPI_HOST
};

app.get('/api/matches/:type', async (req, res) => {
  const type = req.params.type; 
  try {
    const response = await axios.get(`${API_BASE_URL}/matches/v1/${type}`, { headers });
    res.json(response.data);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
app.get('/api/team/:matchId/:teamId', async (req, res) => {
  const { matchId, teamId } = req.params;

  try {
    const response = await axios.get(`${API_BASE_URL}/mcenter/v1/${matchId}/team/${teamId}`, { headers });
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch team players:', error.message);
    res.status(500).json({ error: 'Failed to fetch team players' });
  }
});
