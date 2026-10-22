const mongoose = require('mongoose');

const termSheetSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: [true, 'Term sheet must belong to a startup'],
    index: true
  },
  investor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Term sheet must belong to an investor'],
    index: true
  },
  targetRaise: {
    type: Number
  },
  investmentAmount: {
    type: Number,
    required: [true, 'Please specify the proposed investment amount']
  },
  equityOffered: {
    type: Number,
    required: [true, 'Please specify the equity percentage proposed']
  },
  valuation: {
    type: Number,
    required: [true, 'Please specify the pre-money valuation']
  },
  termsText: {
    type: String,
    required: [true, 'Term sheet details content cannot be empty']
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'accepted', 'rejected'],
    default: 'draft'
  },
  signedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TermSheet', termSheetSchema);
