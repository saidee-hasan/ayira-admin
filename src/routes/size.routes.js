const express = require('express');
const SizeController = require('../controllers/size.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', SizeController.getSizes);
router.get('/active', SizeController.getActiveSizes);
router.get('/:id', SizeController.getSizeById);

// Protected routes (Admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), SizeController.createSize);
router.put('/:id', authenticateToken, authorizeRoles('admin'), SizeController.updateSize);
router.patch('/:id/toggle-status', authenticateToken, authorizeRoles('admin'), SizeController.toggleSizeStatus);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), SizeController.deleteSize);

module.exports = router;