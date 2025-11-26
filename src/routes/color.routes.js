// src/routes/color.routes.js
const express = require('express');
const ColorController = require('../controllers/color.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Public routes - Color data for searching
router.get('/data', ColorController.getColorData);

// Public routes - User's saved colors
router.get('/', ColorController.getColors);
router.get('/stats', ColorController.getColorStats);
router.get('/:id', validateObjectId('id'), ColorController.getColorById);

// Protected routes (Admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), ColorController.addColor);
router.put('/:id', authenticateToken, authorizeRoles('admin'), validateObjectId('id'), ColorController.updateColor);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), validateObjectId('id'), ColorController.deleteColor);

module.exports = router;