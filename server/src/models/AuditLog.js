const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  }, // e.g. 'STARTUP_VERIFY', 'STARTUP_DELETE', 'ROLE_UPDATE', 'REPORT_RESOLVE'
  targetType: {
    type: String,
    required: true
  }, // e.g. 'User', 'Startup', 'Report'
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
