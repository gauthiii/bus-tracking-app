// index.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User'); // Ensure this path matches your project structure
const BusLocation = require('./models/BusLocation'); // Adjust path as necessary
const Driver = require('./models/Driver');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

app.use(cors());
app.use(express.json());

// Endpoint to fetch user details by email
app.get('/api/users/details', async (req, res) => {
    const { email } = req.query;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.json({ name: user.name, email: user.email, role: user.role });  // Add any other user details you need
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).send('Server error');
    }
});


//driver check in
app.post('/api/driver/check-in', async (req, res) => {
    const { email, passcode, busName, lat, lon,address,active,stops } = req.body;

    try {
        // Verify the driver's passcode and email
        const driver = await User.findOne({ email, passcode, role: "driver" });
        if (!driver && active==true) {
            return res.status(401).send('Invalid credentials or not authorized as a driver.');
        }

        // Find the bus by name in BusLocation
        const bus = await BusLocation.findOne({ name: busName });
        if (!bus) {
            return res.status(404).send('Bus not found.');
        }

        if(active==true && parseInt(stops)>bus.routes.length){
            return res.status(404).send('Stops exceeding the route length');
        }

        // Update the bus location with the provided coordinates
        bus.lat = lat;
        bus.lon = lon;
        bus.status = address;
        bus.stopsCompleted = parseInt(stops);
        if(active==true)
        bus.driver = email;
        else
        bus.driver = ""

        await bus.save();

        res.send('Bus location updated successfully.');
    } catch (error) {
        console.error('Error during driver check-in:', error);
        res.status(500).send('Failed to check in.');
    }
});


// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = new User({ email, password, role:"user" });
        await user.save();
        res.status(201).send('User created');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

//Add Driver
app.post('/api/register1', async (req, res) => {
    const { email, password, name, passcode } = req.body;
    try {
        // Check if the email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).send('Email already in use.');
        }

     

        // Create and save the new user
        const user = new User({
            email,
            password,
            name,
            role:"driver",
            passcode,
            // No role or differentiation
        });

        await user.save();

        res.status(201).send('Registration successful.');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send(error.message);
    }
});


// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body; // Assume userType is sent in the request body
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).send('User not found');
        }

        if (!(await user.isValidPassword(password))) {
            return res.status(401).send('Invalid password');
        }

        // Now check if the userType matches the user's role in the database
        if (user.role !== userType) {
            return res.status(403).send(`Access Denied: User is not a ${userType}`);
        }

        // If userType matches, proceed with generating the token
        const token = jwt.sign({ userId: user._id }, process.env.TOKEN_SECRET, { expiresIn: '2h' });
        res.json({ token });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
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
        user.role = "user"
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
      const dummyData = [{ id: 'VB01', lat: 13.038321, lon: 80.213593, name: '24X', route: 'Koyambedu', status: 'Vadapalani',routes:[] }];
    //   busLocations = busLocations.concat(dummyData);

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

// PUT endpoint to update a bus location by custom ID including stops completed
app.put('/api/bus-locations/:id', async (req, res) => {
    const { id } = req.params;
    const { routes, stopsCompleted } = req.body; // Include stopsCompleted in the request body

    try {
        const updates = {
            routes,
            stopsCompleted // Assuming the type conversion/validation is handled appropriately
        };

        const bus = await BusLocation.findOneAndUpdate({ id: id }, updates, { new: true });
        if (!bus) {
            return res.status(404).send('Bus not found');
        }
        res.json(bus);
    } catch (error) {
        console.error('Error updating bus:', error);
        res.status(500).send('Failed to update bus');
    }
});




// GET endpoint to fetch all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Failed to fetch users');
    }
});

// DELETE endpoint to delete a user by ID
app.delete('/api/users/:id', async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            return res.status(404).send('User not found');
        }
        res.send({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).send('Failed to delete user');
    }
});

// DELETE endpoint to delete a bus location by ID
app.delete('/api/bus-locations/:id', async (req, res) => {
    try {
        // Find and delete the bus using the string ID field 'id', not MongoDB's '_id'
        const deletedBus = await BusLocation.findOneAndDelete({ id: req.params.id });
        if (!deletedBus) {
            return res.status(404).send('Bus not found');
        }
        res.send({ message: 'Bus deleted successfully' });
    } catch (error) {
        console.error('Error deleting bus:', error);
        res.status(500).send('Failed to delete bus');
    }
});



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
