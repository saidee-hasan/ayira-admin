const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { ROLES } = require('../config/constants');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient role permissions'
      });
    }

    next();
  };
};

const authorizePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const hasPermission = await UserModel.hasPermission(req.user._id, permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await UserModel.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but we continue without user
    }
  }

  next();
};

// Specific role middlewares
const requireAdmin = [authenticateToken, authorizeRoles(ROLES.ADMIN)];
const requireModerator = [authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR)];
const requireSeller = [authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR, ROLES.SELLER)];
const requireUser = [authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR, ROLES.SELLER, ROLES.USER)];

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizePermission,
  optionalAuth,
  requireAdmin,
  requireModerator,
  requireSeller,
  requireUser
};