const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: [true, 'Application must belong to a startup']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Application must belong to a candidate user']
  },
  roleProposed: {
    type: String,
    required: [true, 'Please specify the role you are applying for'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Please provide an application message'],
    maxLength: [500, 'Message cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// A user can apply to a startup only once
applicationSchema.index({ startup: 1, user: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
