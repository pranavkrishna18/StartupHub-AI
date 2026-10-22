const mongoose = require('mongoose');

const fundraisingSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: [true, 'Fundraising profile must belong to a startup'],
    unique: true,
    index: true
  },
  targetRaise: {
    type: Number,
    required: [true, 'Please specify the target funding raise amount'],
    min: [0, 'Raise target cannot be negative']
  },
  equityOffered: {
    type: Number,
    required: [true, 'Please specify the equity percentage offered'],
    min: [0, 'Equity percentage cannot be negative'],
    max: [100, 'Equity percentage cannot exceed 100%']
  },
  pitchDeckUrl: {
    type: String,
    trim: true
  },
  capTable: [
    {
      holderName: { type: String, required: true },
      shares: { type: Number, required: true },
      ownership: { type: Number, required: true, min: 0, max: 100 },
      role: { type: String, default: 'Investor' }
    }
  ],
  vdrFiles: [
    {
      folderName: { type: String, required: true }, // e.g. Financials, Legal
      fileName: { type: String, required: true },
      fileUrl: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  ndas: [
    {
      investor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      investorName: { type: String, required: true },
      signatureText: { type: String, required: true },
      signedAt: { type: Date, default: Date.now }
    }
  ],
  accessGrants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('Fundraising', fundraisingSchema);
