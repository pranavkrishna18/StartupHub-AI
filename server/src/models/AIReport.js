const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: true,
    unique: true
  },
  validationScore: {
    type: Number,
    required: true
  },
  feasibilityScore: {
    type: Number,
    required: true
  },
  swot: {
    strengths: [{ type: String, trim: true }],
    weaknesses: [{ type: String, trim: true }],
    opportunities: [{ type: String, trim: true }],
    threats: [{ type: String, trim: true }]
  },
  businessModel: {
    revenueStreams: [{ type: String, trim: true }],
    pricingModel: { type: String, trim: true },
    growthStrategy: [{ type: String, trim: true }]
  },
  competitors: [{
    name: { type: String, trim: true },
    comparison: { type: String, trim: true },
    differentiation: { type: String, trim: true }
  }],
  roadmap: [{
    month: { type: String, trim: true },
    milestones: [{ type: String, trim: true }]
  }],
  pitchDeck: {
    problem: { type: String, trim: true },
    solution: { type: String, trim: true },
    market: { type: String, trim: true },
    revenue: { type: String, trim: true },
    team: { type: String, trim: true },
    vision: { type: String, trim: true }
  }
}, {
  timestamps: true
});

const AIReport = mongoose.model('AIReport', aiReportSchema);

module.exports = AIReport;
