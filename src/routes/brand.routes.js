const express = require('express');
const BrandController = require('../controllers/brand.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', BrandController.getBrands);
router.get('/active', BrandController.getActiveBrands);
router.get('/:id', BrandController.getBrandById);

// Protected routes (Admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), BrandController.createBrand);
router.put('/:id', authenticateToken, authorizeRoles('admin'), BrandController.updateBrand);
router.patch('/:id/toggle-status', authenticateToken, authorizeRoles('admin'), BrandController.toggleBrandStatus);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), BrandController.deleteBrand);

module.exports = router;