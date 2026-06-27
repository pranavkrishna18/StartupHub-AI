const { Server } = require('socket.io');
const Message = require('../models/Message');

// Mapping of userId -> socketId
const userSocketMap = new Map();
let ioInstance = null;

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Join conversation room
    socket.on('join', (userId) => {
      if (userId) {
        userSocketMap.set(userId, socket.id);
        console.log(`👤 User joined: User ID ${userId} linked to Socket ${socket.id}`);
        // Broadcast online status (future features)
        io.emit('user_online', userId);
      }
    });

    // Send real-time chat message
    socket.on('send_message', async ({ senderId, receiverId, content }) => {
      try {
        if (!senderId || !receiverId || !content) return;

        // 1. Save message in MongoDB
        const message = await Message.create({
          sender: senderId,
          receiver: receiverId,
          content
        });

        // 2. Route message to receiver if online
        const receiverSocketId = userSocketMap.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', message);
          console.log(`💬 Routed real-time message from ${senderId} to ${receiverId}`);
        } else {
          console.log(`💤 Receiver ${receiverId} is offline. Message cached in DB.`);
        }

        // 3. Confirm to sender
        socket.emit('message_sent', message);

      } catch (err) {
        console.error('Socket message error:', err.message);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      
      // Cleanup mapping
      for (const [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          userSocketMap.delete(userId);
          console.log(`👤 User left: User ID ${userId} unlinked`);
          // Broadcast offline status (future features)
          io.emit('user_offline', userId);
          break;
        }
      }
    });
  });

  return io;
};

const getIO = () => ioInstance;
const getUserSocketId = (userId) => userSocketMap.get(userId.toString());

module.exports = {
  initSocket,
  getIO,
  getUserSocketId,
  userSocketMap
};

