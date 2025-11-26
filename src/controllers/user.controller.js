const UserModel = require('../models/user.model');
const { ApiResponse } = require('../utils/apiResponse');
const { ROLES, PERMISSIONS } = require('../config/constants');
const { ObjectId } = require('mongodb');

class UserController {
  // Create User
  static async createUser(req, res) {
    try {
      const userData = req.body;
      
      // Check if user already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return ApiResponse.error(res, 'User already exists with this email', 409);
      }

      // Validate role
      if (userData.role && !Object.values(ROLES).includes(userData.role)) {
        return ApiResponse.error(res, 'Invalid role', 400);
      }

      const result = await UserModel.create(userData);
      
      return ApiResponse.success(
        res,
        { userId: result.insertedId },
        'User created successfully',
        201
      );
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Get User by Email
  static async getUserByEmail(req, res) {
    try {
      const { email } = req.params;
      
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      // Remove sensitive data
      const { password, ...userData } = user;
      
      return ApiResponse.success(res, userData);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Current User Profile
  static async getCurrentUser(req, res) {
    try {
      const user = req.user;
      
      // Remove sensitive data
      const { password, ...userData } = user;
      
      return ApiResponse.success(res, userData);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Get All Users with Pagination
  static async getUsers(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        role,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      let query = { isActive: true };
      
      if (role && Object.values(ROLES).includes(role)) {
        query.role = role;
      }

      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ];
      }

      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      const options = { page: parseInt(page), limit: parseInt(limit), sort };

      const result = await UserModel.findUsers(query, options);

      // Remove passwords from response
      const usersWithoutPasswords = result.data.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return ApiResponse.paginated(res, usersWithoutPasswords, result.pagination);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Update User Role (Admin only)
  static async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!Object.values(ROLES).includes(role)) {
        return ApiResponse.error(res, 'Invalid role', 400);
      }

      const result = await UserModel.updateRole(new ObjectId(id), { role });

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      return ApiResponse.success(res, null, `User role updated to ${role} successfully`);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Update User Permissions (Admin only)
  static async updateUserPermissions(req, res) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return ApiResponse.error(res, 'Permissions must be an array', 400);
      }

      const result = await UserModel.updatePermissions(new ObjectId(id), permissions);

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      return ApiResponse.success(res, null, 'User permissions updated successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Promote User to Seller
  static async promoteToSeller(req, res) {
    try {
      const { id } = req.params;

      const result = await UserModel.promoteToSeller(new ObjectId(id));

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      return ApiResponse.success(res, null, 'User promoted to seller successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Promote User to Moderator
  static async promoteToModerator(req, res) {
    try {
      const { id } = req.params;

      const result = await UserModel.promoteToModerator(new ObjectId(id));

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      return ApiResponse.success(res, null, 'User promoted to moderator successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Demote User to Regular User
  static async demoteToUser(req, res) {
    try {
      const { id } = req.params;

      const result = await UserModel.demoteToUser(new ObjectId(id));

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      return ApiResponse.success(res, null, 'User demoted to regular user successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Delete User (Soft Delete)
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const result = await UserModel.softDelete(new ObjectId(id));

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      return ApiResponse.success(res, null, 'User deleted successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Get User Stats
  static async getUserStats(req, res) {
    try {
      const stats = await UserModel.getStats();
      
      return ApiResponse.success(res, stats);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Users by Role
  static async getUsersByRole(req, res) {
    try {
      const { role } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!Object.values(ROLES).includes(role)) {
        return ApiResponse.error(res, 'Invalid role', 400);
      }

      const options = { page: parseInt(page), limit: parseInt(limit) };
      const result = await UserModel.getUsersByRole(role, options);

      // Remove passwords from response
      const usersWithoutPasswords = result.data.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return ApiResponse.paginated(res, usersWithoutPasswords, result.pagination);
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }

  // Update Profile (for authenticated users)
  static async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const updateData = req.body;

      // Remove protected fields
      delete updateData.role;
      delete updateData.permissions;
      delete updateData.isActive;

      const result = await UserModel.collection().updateOne(
        { _id: new ObjectId(userId) },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      // Get updated user
      const updatedUser = await UserModel.findById(userId);
      const { password, ...userWithoutPassword } = updatedUser;

      return ApiResponse.success(res, userWithoutPassword, 'Profile updated successfully');
    } catch (error) {
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = UserController;