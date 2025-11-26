const express = require('express');
const ProductStatusController = require('../controllers/product-status.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/featured', ProductStatusController.getFeaturedProducts);
router.get('/new-arrivals', ProductStatusController.getNewArrivals);
router.get('/trending', ProductStatusController.getTrendingProducts);
router.get('/status', ProductStatusController.getProductsByStatus);

// Protected routes (Admin only)
router.patch('/:id/status', authenticateToken, authorizeRoles('admin'), ProductStatusController.updateProductStatus);

module.exports = router;