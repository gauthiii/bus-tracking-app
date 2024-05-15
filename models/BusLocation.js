const mongoose = require('mongoose');

const busLocationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  name: { type: String, required: true },
  route: { type: String, required: true },
  routes: [{ type: String }], // Array of strings for multiple stops
  status: { type: String, required: true }
});

const BusLocation = mongoose.model('BusLocation', busLocationSchema);

module.exports = BusLocation;
