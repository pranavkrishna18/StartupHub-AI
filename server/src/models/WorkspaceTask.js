const mongoose = require('mongoose');

const workspaceTaskSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: [true, 'Task must belong to a startup workspace'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Please specify the task title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dueDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound index for startup task queries
workspaceTaskSchema.index({ startup: 1, status: 1 });

module.exports = mongoose.model('WorkspaceTask', workspaceTaskSchema);
