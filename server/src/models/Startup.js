const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema({
  founder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Startup must belong to a founder']
  },
  name: {
    type: String,
    required: [true, 'Please provide the startup name'],
    unique: true,
    trim: true,
    maxLength: [100, 'Startup name cannot exceed 100 characters']
  },
  tagline: {
    type: String,
    required: [true, 'Please provide a catchy tagline'],
    trim: true,
    maxLength: [150, 'Tagline cannot exceed 150 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a detailed description of your startup']
  },
  logo: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    trim: true
  },
  pitchDeckUrl: {
    type: String,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please select a category for your startup']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'verified'],
    default: 'draft'
  },
  votesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    waitlistCount: {
      type: Number,
      default: 0
    }
  },
  team: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, required: true }
  }]
}, {
  timestamps: true
});

// Index for full-text search
startupSchema.index({ name: 'text', tagline: 'text', description: 'text' });

const Startup = mongoose.model('Startup', startupSchema);

module.exports = Startup;
