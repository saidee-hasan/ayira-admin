// src/routes/subCategory.routes.js
const express = require('express');
const SubCategoryController = require('../controllers/subCategory.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/', SubCategoryController.getSubCategories);
router.get('/search', SubCategoryController.searchSubCategories);
router.get('/category/:categoryId', SubCategoryController.getSubCategoriesByCategory);
router.get('/:id', validateObjectId('id'), SubCategoryController.getSubCategoryById);

// Protected routes (Admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  SubCategoryController.createSubCategory
);

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  SubCategoryController.updateSubCategory
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  SubCategoryController.deleteSubCategory
);

module.exports = router;