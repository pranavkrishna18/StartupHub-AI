const WorkspaceTask = require('../models/WorkspaceTask');
const WorkspaceAnnouncement = require('../models/WorkspaceAnnouncement');
const WorkspaceDocument = require('../models/WorkspaceDocument');
const Startup = require('../models/Startup');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');
const { getIO } = require('../config/socket');

// HELPER: VERIFY IF USER IS A WORKSPACE MEMBER
const checkWorkspaceAccess = async (startupId, userId, userRole) => {
  const startup = await Startup.findById(startupId);
  if (!startup) return { access: false, error: 'Startup not found', status: 404 };

  const isFounder = startup.founder.toString() === userId;
  const isTeamMember = startup.team?.some(t => t.user.toString() === userId);
  const isAdmin = userRole === 'admin';

  if (!isFounder && !isTeamMember && !isAdmin) {
    return { access: false, error: 'Access denied: You are not a member of this startup team', status: 403 };
  }

  return { access: true, startup };
};

// GET BATCHED WORKSPACE DATA
exports.getWorkspaceData = async (req, res, next) => {
  try {
    const { startupId } = req.params;

    const accessCheck = await checkWorkspaceAccess(startupId, req.user.id, req.user.role);
    if (!accessCheck.access) {
      return next(new AppError(accessCheck.error, accessCheck.status));
    }

    // Parallel fetch for performance optimization
    const [tasks, announcements, documents] = await Promise.all([
      WorkspaceTask.find({ startup: startupId }).populate('assignee', 'email').sort({ createdAt: -1 }),
      WorkspaceAnnouncement.find({ startup: startupId }).populate('author', 'email').sort({ isPinned: -1, createdAt: -1 }),
      WorkspaceDocument.find({ startup: startupId }).populate('author', 'email').sort({ updatedAt: -1 })
    ]);

    // Gather teammate profiles to list in task assignment dropdowns
    const startup = await Startup.findById(startupId).populate('team.user', 'email');
    
    // Enrich teammate profiles with full names
    const teamUserIds = [startup.founder, ...startup.team.map(t => t.user._id)];
    const profiles = await Profile.find({ user: { $in: teamUserIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p]));

    const teamList = [
      {
        _id: startup.founder,
        email: req.user.id === startup.founder.toString() ? req.user.email : 'Founder',
        fullName: profileMap.get(startup.founder.toString())?.fullName || 'Founder Owner',
        role: 'Founder'
      },
      ...startup.team.map(t => ({
        _id: t.user._id,
        email: t.user.email,
        fullName: profileMap.get(t.user._id.toString())?.fullName || 'Team Member',
        role: t.role
      }))
    ];

    res.status(200).json({
      status: 'success',
      data: {
        startup: {
          _id: startup._id,
          name: startup.name,
          founder: startup.founder
        },
        tasks,
        announcements,
        documents,
        teamList
      }
    });
  } catch (err) {
    next(err);
  }
};

// CREATE TASK
exports.createTask = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { title, description, priority, assignee, dueDate } = req.body;

    const accessCheck = await checkWorkspaceAccess(startupId, req.user.id, req.user.role);
    if (!accessCheck.access) {
      return next(new AppError(accessCheck.error, accessCheck.status));
    }

    const task = await WorkspaceTask.create({
      startup: startupId,
      title,
      description,
      priority,
      assignee: assignee || undefined,
      dueDate
    });

    const populatedTask = await WorkspaceTask.findById(task._id).populate('assignee', 'email');

    // Socket emit to workspace channel
    const io = getIO();
    if (io) {
      io.to(`startup_workspace_${startupId}`).emit('task_created', populatedTask);
    }

    res.status(201).json({
      status: 'success',
      data: { task: populatedTask }
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE TASK
exports.updateTask = async (req, res, next) => {
  try {
    const { startupId, taskId } = req.params;
    const updateData = req.body;

    const accessCheck = await checkWorkspaceAccess(startupId, req.user.id, req.user.role);
    if (!accessCheck.access) {
      return next(new AppError(accessCheck.error, accessCheck.status));
    }

    const task = await WorkspaceTask.findOneAndUpdate(
      { _id: taskId, startup: startupId },
      updateData,
      { new: true, runValidators: true }
    ).populate('assignee', 'email');

    if (!task) {
      return next(new AppError('Task not found in this workspace', 404));
    }

    // Socket emit to workspace channel
    const io = getIO();
    if (io) {
      io.to(`startup_workspace_${startupId}`).emit('task_updated', task);
    }

    res.status(200).json({
      status: 'success',
      data: { task }
    });
  } catch (err) {
    next(err);
  }
};

// CREATE ANNOUNCEMENT (FOUNDER/ADMIN ONLY)
exports.createAnnouncement = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { title, content, isPinned } = req.body;

    const accessCheck = await checkWorkspaceAccess(startupId, req.user.id, req.user.role);
    if (!accessCheck.access) {
      return next(new AppError(accessCheck.error, accessCheck.status));
    }

    // Block non-founders from posting announcements
    const isFounder = accessCheck.startup.founder.toString() === req.user.id;
    if (!isFounder && req.user.role !== 'admin') {
      return next(new AppError('Only the startup owner can post announcements', 403));
    }

    const announcement = await WorkspaceAnnouncement.create({
      startup: startupId,
      title,
      content,
      isPinned,
      author: req.user.id
    });

    const populatedAnn = await WorkspaceAnnouncement.findById(announcement._id).populate('author', 'email');

    // Socket emit
    const io = getIO();
    if (io) {
      io.to(`startup_workspace_${startupId}`).emit('announcement_created', populatedAnn);
    }

    res.status(201).json({
      status: 'success',
      data: { announcement: populatedAnn }
    });
  } catch (err) {
    next(err);
  }
};

// PIN/UNPIN ANNOUNCEMENT (FOUNDER/ADMIN ONLY)
exports.togglePinAnnouncement = async (req, res, next) => {
  try {
    const { startupId, announcementId } = req.params;

    const accessCheck = await checkWorkspaceAccess(startupId, req.user.id, req.user.role);
    if (!accessCheck.access) {
      return next(new AppError(accessCheck.error, accessCheck.status));
    }

    const isFounder = accessCheck.startup.founder.toString() === req.user.id;
    if (!isFounder && req.user.role !== 'admin') {
      return next(new AppError('Only the startup owner can pin announcements', 403));
    }

    const announcement = await WorkspaceAnnouncement.findOne({ _id: announcementId, startup: startupId });
    if (!announcement) {
      return next(new AppError('Announcement not found', 404));
    }

    announcement.isPinned = !announcement.isPinned;
    await announcement.save();

    const populatedAnn = await WorkspaceAnnouncement.findById(announcement._id).populate('author', 'email');

    // Socket emit
    const io = getIO();
    if (io) {
      io.to(`startup_workspace_${startupId}`).emit('announcement_updated', populatedAnn);
    }

    res.status(200).json({
      status: 'success',
      data: { announcement: populatedAnn }
    });
  } catch (err) {
    next(err);
  }
};

// CREATE DOCUMENT
exports.createDocument = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { title, content, type } = req.body;

    const accessCheck = await checkWorkspaceAccess(startupId, req.user.id, req.user.role);
    if (!accessCheck.access) {
      return next(new AppError(accessCheck.error, accessCheck.status));
    }

    const document = await WorkspaceDocument.create({
      startup: startupId,
      title,
      content,
      type,
      author: req.user.id
    });

    const populatedDoc = await WorkspaceDocument.findById(document._id).populate('author', 'email');

    // Socket emit
    const io = getIO();
    if (io) {
      io.to(`startup_workspace_${startupId}`).emit('document_created', populatedDoc);
    }

    res.status(201).json({
      status: 'success',
      data: { document: populatedDoc }
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE DOCUMENT
exports.updateDocument = async (req, res, next) => {
  try {
    const { startupId, docId } = req.params;
    const { title, content, type } = req.body;

    const accessCheck = await checkWorkspaceAccess(startupId, req.user.id, req.user.role);
    if (!accessCheck.access) {
      return next(new AppError(accessCheck.error, accessCheck.status));
    }

    const document = await WorkspaceDocument.findOneAndUpdate(
      { _id: docId, startup: startupId },
      { title, content, type },
      { new: true, runValidators: true }
    ).populate('author', 'email');

    if (!document) {
      return next(new AppError('Document not found in this workspace', 404));
    }

    // Socket emit
    const io = getIO();
    if (io) {
      io.to(`startup_workspace_${startupId}`).emit('document_updated', document);
    }

    res.status(200).json({
      status: 'success',
      data: { document }
    });
  } catch (err) {
    next(err);
  }
};
