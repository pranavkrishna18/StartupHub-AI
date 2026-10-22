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
  jobOpening: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobOpening',
    required: [true, 'Application must be linked to a specific job opening']
  },
  message: {
    type: String,
    required: [true, 'Please provide an application message'],
    maxLength: [500, 'Message cannot exceed 500 characters']
  },
  resumeText: {
    type: String
  },
  resumeFile: {
    type: String
  },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  currentStage: {
    type: String,
    default: 'Screening'
  },
  historicalStages: [
    {
      stage: {
        type: String,
        required: true
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  evaluation: {
    compatibilityScore: { type: Number, min: 0, max: 100 },
    atsScore: { type: Number, min: 0, max: 100 },
    skillMatch: { type: Number, min: 0, max: 100 },
    experienceMatch: { type: Number, min: 0, max: 100 },
    cultureMatch: { type: Number, min: 0, max: 100 },
    communicationScore: { type: Number, min: 0, max: 100 },
    missingSkills: [String],
    strengths: [String],
    weaknesses: [String],
    growthSuggestions: [String],
    recommendedRole: String,
    evaluatedAt: Date
  }
}, {


  timestamps: true
});

// A user can apply to a specific job opening only once
applicationSchema.index({ jobOpening: 1, user: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;
