const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: [true, 'Please provide your full name'],
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxLength: [500, 'Bio cannot exceed 500 characters']
  },
  headline: {
    type: String,
    maxLength: [100, 'Headline cannot exceed 100 characters']
  },
  skills: [{
    type: String,
    trim: true
  }],
  interests: [{
    type: String,
    trim: true
  }],
  experience: [{
    title: { type: String, required: true },
    company: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: Date,
    current: { type: Boolean, default: false },
    description: String
  }],
  socialLinks: {
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    twitter: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  resumeAnalysis: {
    resumeText: String,
    resumeFile: String,
    extractedSkills: [String],

    extractedExperience: [String],
    extractedEducation: [String],
    extractedProjects: [String],
    extractedCertifications: [String],
    extractedInterests: [String],
    resumeScore: { type: Number, min: 0, max: 100 },
    atsScore: { type: Number, min: 0, max: 100 },
    compatibility: { type: Number, min: 0, max: 100 },
    missingSkills: [String],
    learningRoadmap: [String],
    recommendedStartups: [
      {
        startupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Startup' },
        name: String,
        matchReason: String
      }
    ],
    recommendedRoles: [String],
    personalizedSuggestions: [String],
    analyzedAt: { type: Date }
  }
}, {

  timestamps: true
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;
