// src/routes/productFit.routes.js
const express = require('express');
const ProductFitController = require('../controllers/productFit.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/', ProductFitController.getProductFits);
router.get('/search', ProductFitController.searchProductFits);
router.get('/active', ProductFitController.getActiveProductFits);
router.get('/:id', validateObjectId('id'), ProductFitController.getProductFitById);

// Protected routes (Admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  ProductFitController.createProductFit
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  ProductFitController.updateProductFit
);

router.patch(
  '/:id/toggle-status',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  ProductFitController.toggleProductFitStatus
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  ProductFitController.deleteProductFit
);

module.exports = router;