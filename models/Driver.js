const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    passcode: { type: String, required: true, minlength: 6, maxlength: 6 }
});

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
