const { getDB } = require('../config/database');
const { ROLES, PERMISSIONS } = require('../config/constants');
const { ObjectId } = require('mongodb');

class UserModel {
  static collection() {
    return getDB().collection('All-Users');
  }

  static async create(userData) {
    const defaultPermissions = this.getDefaultPermissions(userData.role);
    
    return await this.collection().insertOne({
      ...userData,
      role: userData.role || ROLES.USER,
      permissions: userData.permissions || defaultPermissions,
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  static async findByEmail(email) {
    return await this.collection().findOne({ email: email.toLowerCase() });
  }

  static async findById(id) {
    return await this.collection().findOne({ _id: new ObjectId(id) });
  }

  static async findUsers(query = {}, options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      sort = { createdAt: -1 },
      projection = {} 
    } = options;

    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      this.collection()
        .find(query, { projection })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection().countDocuments(query)
    ]);

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async updateRole(id, roleData) {
    const permissions = this.getDefaultPermissions(roleData.role);
    
    return await this.collection().updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          role: roleData.role,
          permissions: roleData.permissions || permissions,
          updatedAt: new Date()
        } 
      }
    );
  }

  static async updatePermissions(id, permissions) {
    return await this.collection().updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          permissions,
          updatedAt: new Date()
        } 
      }
    );
  }

  static async deleteById(id) {
    return await this.collection().deleteOne({ _id: new ObjectId(id) });
  }

  static async softDelete(id) {
    return await this.collection().updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          isActive: false,
          deletedAt: new Date()
        } 
      }
    );
  }

  static async getStats() {
    const [totalUsers, totalSellers, totalModerators, totalAdmins] = await Promise.all([
      this.collection().countDocuments({ role: ROLES.USER, isActive: true }),
      this.collection().countDocuments({ role: ROLES.SELLER, isActive: true }),
      this.collection().countDocuments({ role: ROLES.MODERATOR, isActive: true }),
      this.collection().countDocuments({ role: ROLES.ADMIN, isActive: true })
    ]);

    return { totalUsers, totalSellers, totalModerators, totalAdmins };
  }

  static async getUsersByRole(role, options = {}) {
    return await this.findUsers({ role, isActive: true }, options);
  }

  static async hasPermission(userId, permission) {
    const user = await this.findById(userId);
    if (!user) return false;

    // Admin has all permissions
    if (user.role === ROLES.ADMIN) return true;

    // Check if user has the specific permission
    return user.permissions.includes(permission) || user.permissions.includes('all');
  }

  static getDefaultPermissions(role) {
    return PERMISSIONS[role.toUpperCase()] || PERMISSIONS.USER;
  }

  static async promoteToSeller(userId) {
    return await this.updateRole(userId, { role: ROLES.SELLER });
  }

  static async promoteToModerator(userId) {
    return await this.updateRole(userId, { role: ROLES.MODERATOR });
  }

  static async demoteToUser(userId) {
    return await this.updateRole(userId, { role: ROLES.USER });
  }
}

module.exports = UserModel;