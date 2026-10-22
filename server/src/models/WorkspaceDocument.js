const mongoose = require('mongoose');

const workspaceDocumentSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: [true, 'Document must belong to a startup workspace'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Please specify the document title'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Document content cannot be empty'],
    default: '# New Document'
  },
  type: {
    type: String,
    enum: ['document', 'meeting-note', 'roadmap'],
    default: 'document'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for document type lookups inside workspaces
workspaceDocumentSchema.index({ startup: 1, type: 1 });

module.exports = mongoose.model('WorkspaceDocument', workspaceDocumentSchema);
