const { ObjectId } = require('mongodb');
const { ROLES, PERMISSIONS } = require('../config/constants');

class Helpers {
  static generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  static validateObjectId(id) {
    return ObjectId.isValid(id);
  }

  static sanitizeUser(user) {
    if (!user) return null;
    
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  static buildSearchQuery(searchTerm, searchFields) {
    if (!searchTerm || !searchFields.length) return {};

    const searchConditions = searchFields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }));

    return { $or: searchConditions };
  }

  static parseJSONFields(data, fields) {
    const result = { ...data };
    
    fields.forEach(field => {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = JSON.parse(result[field]);
        } catch (error) {
          console.warn(`Failed to parse JSON field: ${field}`);
        }
      }
    });
    
    return result;
  }

  static formatPaginationResponse(data, pagination) {
    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
        hasNext: pagination.page < pagination.totalPages,
        hasPrev: pagination.page > 1
      }
    };
  }

  static getImageUrl(req, filename) {
    if (!filename) return null;
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
  }

  static checkPermission(user, permission) {
    if (!user || !user.role) return false;
    
    // Admin has all permissions
    if (user.role === ROLES.ADMIN) return true;
    
    // Check if user has the specific permission
    const userPermissions = user.permissions || PERMISSIONS[user.role.toUpperCase()] || [];
    return userPermissions.includes(permission) || userPermissions.includes('all');
  }

  static canManageProduct(user, product) {
    if (!user || !product) return false;
    
    // Admin and moderators can manage all products
    if (user.role === ROLES.ADMIN || user.role === ROLES.MODERATOR) return true;
    
    // Sellers can only manage their own products
    if (user.role === ROLES.SELLER && product.sellerId === user._id.toString()) return true;
    
    return false;
  }

  static getRoleHierarchy(role) {
    const hierarchy = {
      [ROLES.USER]: 1,
      [ROLES.SELLER]: 2,
      [ROLES.MODERATOR]: 3,
      [ROLES.ADMIN]: 4
    };
    
    return hierarchy[role] || 0;
  }

  static canModifyUser(requester, targetUser) {
    if (!requester || !targetUser) return false;
    
    const requesterLevel = this.getRoleHierarchy(requester.role);
    const targetLevel = this.getRoleHierarchy(targetUser.role);
    
    // Can only modify users with lower or equal role level
    return requesterLevel >= targetLevel;
  }
}

module.exports = Helpers;