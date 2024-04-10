// index.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User'); // Ensure this path matches your project structure
const BusLocation = require('./models/BusLocation'); // Adjust path as necessary

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

app.use(cors());
app.use(express.json());

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = new User({ email, password });
        await user.save();
        res.status(201).send('User created');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.isValidPassword(password))) {
            return res.status(401).send('Invalid email or password');
        }

        // Check if the user has a name and passcode set
        if (!user.name || !user.passcode) {
            // Respond with a special status to indicate additional info is needed
            return res.status(202).send({ message: "Additional information required", userId: user._id });
        }

        const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET, { expiresIn: '2h' });
        res.json({ token });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Get Profile
app.get('/api/profile', async (req, res) => {
    try {
        const { authorization } = req.headers;
        const token = authorization && authorization.split(' ')[1];

        if (!token) return res.status(401).send('Access Denied: No token provided!');

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) return res.status(404).send('User not found.');

        const { name, email, passcode } = user;
        res.json({ name, email, passcode });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
});


// Endpoint to set name and passcode
app.post('/api/set-details', async (req, res) => {
    try {
        const { userId, name, passcode } = req.body;
        if (passcode.length !== 6) {
            return res.status(400).send('Passcode must be 6 digits long.');
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User not found.');
        }

        user.name = name;
        user.passcode = passcode;
        await user.save();

        res.status(200).send({ message: "User updated successfully" });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Endpoint to fetch bus locations
app.get('/api/bus-locations', async (req, res) => {
  try {
      // Fetch actual bus locations from the database
      let busLocations = await BusLocation.find({});

      // Append dummy data to the actual data
      const dummyData = [{ id: 'VB01', lat: 13.038321, lon: 80.213593, name: '24X', route: 'Koyambedu', status: 'Vadapalani' }];
      busLocations = busLocations.concat(dummyData);

      res.json(busLocations);
  } catch (error) {
      console.error('Error fetching bus locations:', error);
      res.status(500).send('Server error');
  }
});

app.post('/api/bus-locations', async (req, res) => {
  // Generate a simple random ID; consider a more robust ID generation for production
  const id = `VB${Math.floor(Math.random() * 10000)}`;

  const busData = {
      ...req.body,
      id
  };

  try {
      const newBusLocation = new BusLocation(busData);
      await newBusLocation.save();
      res.status(201).send({ message: "Bus location added", busData: newBusLocation });
  } catch (error) {
      console.error('Error saving bus location:', error);
      res.status(500).send(error.message);
  }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
