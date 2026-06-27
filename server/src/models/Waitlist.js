const mongoose = require('mongoose');
const validator = require('validator');

const waitlistSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email address'],
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide a valid email address']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Guarantee a user/email can only join a startup's waitlist once
waitlistSchema.index({ startup: 1, email: 1 }, { unique: true });

const Waitlist = mongoose.model('Waitlist', waitlistSchema);

module.exports = Waitlist;
