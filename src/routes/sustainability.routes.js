// src/routes/sustainability.routes.js
const express = require('express');
const SustainabilityController = require('../controllers/sustainability.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/', SustainabilityController.getSustainabilityAttributes);
router.get('/search', SustainabilityController.searchSustainability);
router.get('/stats', SustainabilityController.getSustainabilityStats);
router.get('/:id', validateObjectId('id'), SustainabilityController.getSustainabilityById);

// Protected routes (Admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  SustainabilityController.createSustainability
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  SustainabilityController.updateSustainability
);

router.patch(
  '/:id/toggle-status',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  SustainabilityController.toggleSustainabilityStatus
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  SustainabilityController.deleteSustainability
);

module.exports = router;