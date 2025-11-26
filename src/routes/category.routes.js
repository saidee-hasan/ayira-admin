// src/routes/category.routes.js
const express = require('express');
const CategoryController = require('../controllers/category.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/', CategoryController.getCategories);
router.get('/search', CategoryController.searchCategories);

// Protected routes (Admin only)
router.post(
  '/', 
  authenticateToken, 
  authorizeRoles('admin'), 
  CategoryController.createCategory
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  CategoryController.updateCategory
);

router.delete(
  '/:id', 
  authenticateToken, 
  authorizeRoles('admin'), 
  validateObjectId('id'),
  CategoryController.deleteCategory
);

module.exports = router;