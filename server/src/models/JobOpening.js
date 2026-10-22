const mongoose = require('mongoose');

const SUPPORTED_ROLES = [
  'Founder',
  'Technical Co-Founder',
  'Business Co-Founder',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'AI Engineer',
  'ML Engineer',
  'Data Scientist',
  'Cloud Engineer',
  'DevOps Engineer',
  'Cybersecurity Engineer',
  'UI Designer',
  'UX Designer',
  'Graphic Designer',
  'Product Designer',
  'Product Manager',
  'Business Analyst',
  'Marketing Lead',
  'Growth Hacker',
  'Sales Lead',
  'Finance Manager',
  'Legal Advisor',
  'Community Manager',
  'Content Writer',
  'QA Engineer',
  'Intern',
  'Volunteer'
];

const jobOpeningSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: [true, 'Job opening must belong to a startup'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Please specify the role title'],
    enum: {
      values: SUPPORTED_ROLES,
      message: 'Role title must be one of the supported 29 startup roles'
    }
  },
  responsibilities: {
    type: String,
    required: [true, 'Please specify the primary responsibilities for this role'],
    trim: true
  },
  requiredSkills: {
    type: [String],
    required: [true, 'Please list at least one required skill'],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length > 0;
      },
      message: 'A job opening must require at least one skill'
    }
  },
  preferredSkills: {
    type: [String],
    default: []
  },
  experience: {
    type: String,
    required: [true, 'Please specify experience requirements (e.g. 2+ years, entry level)']
  },
  compensation: {
    type: String,
    required: [true, 'Please specify compensation details (e.g. Unpaid, $5000/mo, Equity Only)']
  },
  equity: {
    type: String,
    default: '0%'
  },
  workMode: {
    type: String,
    enum: ['remote', 'hybrid', 'on-site'],
    default: 'remote'
  },
  location: {
    type: String,
    required: [
      function() {
        return this.workMode === 'hybrid' || this.workMode === 'on-site';
      },
      'Location is required for hybrid or on-site roles'
    ]
  },
  applicationDeadline: {
    type: Date
  },
  hiringStages: {
    type: [String],
    default: ['Screening', 'Technical Evaluation', 'HR Interview', 'Offer', 'Hired', 'Rejected']
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('JobOpening', jobOpeningSchema);
