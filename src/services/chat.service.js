const { getCollection } = require('../config/database');
const { ObjectId } = require('mongodb');

const conversationsCollection = () => getCollection('conversations');

class ChatService {
  static async createOrUpdateConversation(userId, message, senderRole = 'user') {
    const conversationFilter = {
      'participants.userId': new ObjectId(userId)
    };

    const newMessage = {
      _id: new ObjectId(),
      senderId: new ObjectId(userId),
      senderRole,
      content: message,
      timestamp: new Date(),
      read: false
    };

    const update = {
      $push: { messages: newMessage },
      $setOnInsert: {
        participants: [
          { userId: new ObjectId(userId), role: 'user' },
          { userId: null, role: 'admin' }
        ],
        createdAt: new Date()
      },
      $set: {
        updatedAt: new Date()
      }
    };

    const result = await conversationsCollection().updateOne(
      conversationFilter,
      update,
      { upsert: true }
    );

    return { message: newMessage, isNew: result.upsertedCount > 0 };
  }

  static async getConversationByUserId(userId) {
    return await conversationsCollection().findOne({
      'participants.userId': new ObjectId(userId)
    });
  }

  static async markMessagesAsRead(userId) {
    return await conversationsCollection().updateOne(
      { 'participants.userId': new ObjectId(userId) },
      { 
        $set: { 
          'messages.$[].read': true,
          updatedAt: new Date()
        } 
      }
    );
  }

  static async getUnreadMessageCount(userId) {
    const conversation = await this.getConversationByUserId(userId);
    
    if (!conversation || !conversation.messages) {
      return 0;
    }

    return conversation.messages.filter(msg => 
      !msg.read && msg.senderRole === 'admin'
    ).length;
  }

  static async getAdminConversations() {
    return await conversationsCollection()
      .aggregate([
        { $unwind: "$participants" },
        { $match: { "participants.role": "user" } },
        {
          $lookup: {
            from: "All-Users",
            localField: "participants.userId",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $project: {
            _id: 1,
            lastMessage: {
              $ifNull: [{ $arrayElemAt: ["$messages.content", -1] }, "No messages yet..."],
            },
            lastMessageTimestamp: { $arrayElemAt: ["$messages.timestamp", -1] },
            customerName: { $arrayElemAt: ["$userDetails.name", 0] },
            customerEmail: { $arrayElemAt: ["$userDetails.email", 0] },
            userId: "$participants.userId",
            unreadCount: {
              $size: {
                $filter: {
                  input: "$messages",
                  as: "msg",
                  cond: { 
                    $and: [
                      { $eq: ["$$msg.read", false] },
                      { $eq: ["$$msg.senderRole", "user"] }
                    ]
                  }
                }
              }
            }
          },
        },
        { $sort: { lastMessageTimestamp: -1 } },
      ])
      .toArray();
  }
}

module.exports = ChatService;