const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema({
  founder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: true
  },
  documentUrl: {
    type: String,
    required: true
  }, // Verification proof mock file/url
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
