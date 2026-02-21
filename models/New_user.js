
const mongoose = require('mongoose');


// User personal details
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    addresses: [{
        fullName: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: 'India' }
    }],
    profilePic: { type: String, default: '' }
});

module.exports = mongoose.model("New_User", userSchema);
