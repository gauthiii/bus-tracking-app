// index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Dummy endpoint to simulate fetching bus locations
app.get('/api/bus-locations', async (req, res) => {
  try {
    // Replace with actual API call or database query
    const mockBusLocations = [{ id: 1, lat: 40.712776, lon: -74.005974, name: 'Bus 1' }];
    res.json(mockBusLocations);
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
