const Message = require('../models/Message');
const User = require('../models/User');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');

// SEND MESSAGE (REST FALLBACK)
exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return next(new AppError('Receiver and content are required', 400));
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content
    });

    res.status(201).json({
      status: 'success',
      data: {
        message
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET CONVERSATION HISTORIES
exports.getConversation = async (req, res, next) => {
  try {
    const { otherUserId } = req.params;
    const myId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherUserId },
        { sender: otherUserId, receiver: myId }
      ]
    }).sort({ createdAt: 1 });

    // Mark messages sent by the other user as read
    await Message.updateMany(
      { sender: otherUserId, receiver: myId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: {
        messages
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET RECENT CONVERSATIONS WITH SUMMARIES
exports.getRecentChats = async (req, res, next) => {
  try {
    const myId = req.user.id;

    // Aggregate to find unique chat partners
    const chats = await Message.find({
      $or: [{ sender: myId }, { receiver: myId }]
    }).sort({ createdAt: -1 });

    const partners = new Set();
    const recentChats = [];

    for (const msg of chats) {
      const partnerId = msg.sender.toString() === myId ? msg.receiver.toString() : msg.sender.toString();
      if (!partners.has(partnerId)) {
        partners.add(partnerId);

        // Fetch partner details
        const partnerUser = await User.findById(partnerId);
        if (partnerUser) {
          const profile = await Profile.findOne({ user: partnerId });
          
          // Get unread count
          const unreadCount = await Message.countDocuments({
            sender: partnerId,
            receiver: myId,
            isRead: false
          });

          recentChats.push({
            partnerId,
            email: partnerUser.email,
            role: partnerUser.role,
            fullName: profile?.fullName || 'User',
            avatar: profile?.avatar || '',
            lastMessage: msg.content,
            lastMessageTime: msg.createdAt,
            unreadCount
          });
        }
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        chats: recentChats
      }
    });
  } catch (error) {
    next(error);
  }
};
