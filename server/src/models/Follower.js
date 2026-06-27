const mongoose = require('mongoose');

const followerSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Guarantee unique follower links
followerSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follower = mongoose.model('Follower', followerSchema);

module.exports = Follower;
