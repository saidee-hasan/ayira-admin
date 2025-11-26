const express = require('express');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { ApiResponse } = require('../utils/apiResponse');

const router = express.Router();

// Generate JWT token endpoint
router.post('/jwt', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return ApiResponse.error(res, 'Email is required', 400);
    }

    // Find user by email
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-fallback-secret-key',
      { expiresIn: '7d' }
    );

    return ApiResponse.success(res, { 
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoURL: user.photoURL
      }
    }, 'Token generated successfully');
  } catch (error) {
    console.error('JWT generation error:', error);
    return ApiResponse.error(res, 'Failed to generate token');
  }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return ApiResponse.error(res, 'Token is required', 400);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-fallback-secret-key');
    
    // Get fresh user data
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404);
    }

    return ApiResponse.success(res, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoURL: user.photoURL,
        permissions: user.permissions
      },
      valid: true
    }, 'Token is valid');
  } catch (error) {
    return ApiResponse.error(res, 'Invalid token', 401);
  }
});

module.exports = router;