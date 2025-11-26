const { Server } = require('socket.io');
const { getCollection } = require('./database');
const { ObjectId } = require('mongodb');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
      methods: ["GET", "POST"]
    }
  });

  const conversationsCollection = () => getCollection('conversations');

  io.on('connection', (socket) => {
    console.log(`🔗 User connected: ${socket.id}`);

    // Join user room
    socket.on('join', async (data) => {
      const { userId, role } = data;
      
      if (role === 'admin') {
        socket.join('admin-room');
        console.log(`👨‍💼 Admin ${userId} joined admin room`);
      } else {
        socket.join(userId);
        console.log(`👤 User ${userId} joined room: ${userId}`);
      }
    });

    // Handle real-time messages
    socket.on('sendMessage', async (data) => {
      try {
        const { sender, recipient, content } = data;
        
        if (!sender?.userId || !content) {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        const message = {
          _id: new ObjectId(),
          senderId: new ObjectId(sender.userId),
          senderRole: sender.role,
          content,
          timestamp: new Date()
        };

        const conversationUserId = sender.role === 'admin' ? recipient.userId : sender.userId;
        
        const conversationFilter = {
          'participants.userId': new ObjectId(conversationUserId)
        };

        const update = {
          $push: { messages: message },
          $setOnInsert: {
            participants: [
              { userId: new ObjectId(conversationUserId), role: 'user' },
              { userId: null, role: 'admin' }
            ],
            createdAt: new Date()
          }
        };

        await conversationsCollection().updateOne(conversationFilter, update, { upsert: true });

        const payload = {
          ...message,
          conversationUserId: new ObjectId(conversationUserId),
          senderName: sender.name || 'Customer'
        };

        // Emit to appropriate rooms
        if (sender.role === 'admin') {
          io.to(recipient.userId).emit('newMessage', payload);
        } else {
          io.to('admin-room').emit('newMessage', payload);
        }

      } catch (error) {
        console.error('Socket message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };