const AuditLog = require('../models/AuditLog');

/**
 * Utility to log administrative actions to the database.
 * @param {Object} req Express request object (contains req.user, req.ip, headers)
 * @param {String} action Action name (e.g. 'STARTUP_VERIFY', 'STARTUP_DELETE', 'ROLE_UPDATE')
 * @param {String} targetType Target model name (e.g. 'User', 'Startup', 'Report')
 * @param {String} targetId Target document ObjectId
 * @param {Object} details Additional key-value details
 */
const logAudit = async (req, action, targetType, targetId, details = {}) => {
  try {
    const actor = req.user ? req.user._id : null;
    if (!actor) return; // Action must be tied to an authenticated admin/user

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await AuditLog.create({
      actor,
      action,
      targetType,
      targetId,
      ipAddress,
      userAgent,
      details
    });
  } catch (error) {
    console.error('Failed to create audit log:', error.message);
  }
};

module.exports = { logAudit };
