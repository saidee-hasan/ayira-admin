const UserModel = require('../models/user.model');
const { ObjectId } = require('mongodb');

class UserService {
  static async createUser(userData) {
    return await UserModel.create(userData);
  }

  static async getUserByEmail(email) {
    return await UserModel.findByEmail(email);
  }

  static async getUserById(userId) {
    return await UserModel.findById(new ObjectId(userId));
  }

  static async getAllUsers(filters = {}, options = {}) {
    return await UserModel.findUsers(filters, options);
  }

  static async updateUserRole(userId, roleData) {
    return await UserModel.updateRole(new ObjectId(userId), roleData);
  }

  static async deleteUser(userId) {
    return await UserModel.deleteById(new ObjectId(userId));
  }

  static async getUsersStats() {
    return await UserModel.getStats();
  }

  static async getStaffMembers() {
    return await UserModel.findUsers({ role: 'staff' }, { limit: 50 });
  }

  static async searchUsers(searchTerm, options = {}) {
    const query = {
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    };

    return await UserModel.findUsers(query, options);
  }

  static async getPromotableUsers() {
    return await UserModel.findUsers(
      { role: 'user' }, 
      { 
        projection: { _id: 1, name: 1, email: 1, createdAt: 1 },
        sort: { name: 1 },
        limit: 100 
      }
    );
  }
}

module.exports = UserService;