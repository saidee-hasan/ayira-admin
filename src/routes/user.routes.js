const express = require('express');
const UserController = require('../controllers/user.controller');
const { authenticateToken, authorizeRoles, authorizePermission } = require('../middleware/auth');
const { validateUser, validateObjectId } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimit');
const { ROLES } = require('../config/constants');

const router = express.Router();

// Public routes
router.post('/', generalLimiter, validateUser, UserController.createUser);
router.get('/email/:email', generalLimiter, UserController.getUserByEmail);

// Protected routes - All authenticated users
router.get('/profile', authenticateToken, UserController.getCurrentUser);
router.put('/profile', authenticateToken, UserController.updateProfile);

// Moderator & Admin routes
router.get('/', authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR), UserController.getUsers);
router.get('/stats', authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR), UserController.getUserStats);
router.get('/role/:role', authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR), UserController.getUsersByRole);

// Admin only routes
router.patch('/:id/role', authenticateToken, authorizeRoles(ROLES.ADMIN), validateObjectId('id'), UserController.updateUserRole);
router.patch('/:id/permissions', authenticateToken, authorizeRoles(ROLES.ADMIN), validateObjectId('id'), UserController.updateUserPermissions);
router.patch('/:id/promote/seller', authenticateToken, authorizeRoles(ROLES.ADMIN), validateObjectId('id'), UserController.promoteToSeller);
router.patch('/:id/promote/moderator', authenticateToken, authorizeRoles(ROLES.ADMIN), validateObjectId('id'), UserController.promoteToModerator);
router.patch('/:id/demote/user', authenticateToken, authorizeRoles(ROLES.ADMIN), validateObjectId('id'), UserController.demoteToUser);
router.delete('/:id', authenticateToken, authorizeRoles(ROLES.ADMIN), validateObjectId('id'), UserController.deleteUser);

module.exports = router;