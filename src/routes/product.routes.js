const express = require('express');
const ProductController = require('../controllers/product.controller');
const { uploadProduct, handleCloudinaryUpload } = require('../middleware/upload');
const { validateProduct, validateObjectId } = require('../middleware/validation');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

const router = express.Router();

// Public routes
router.get('/', ProductController.getProducts);
router.get('/search', ProductController.searchProducts);
router.get('/popular', ProductController.getPopularProducts);
router.get('/related', ProductController.getRelatedProducts);
// In your product routes - make sure this route exists
router.get('/:id', ProductController.getProductById);


// Get product form dropdown data
router.get('/form/data', ProductController.getProductFormData);

// Protected routes - Sellers can manage their own products
router.get('/seller/my-products', authenticateToken, authorizeRoles(ROLES.SELLER, ROLES.ADMIN, ROLES.MODERATOR), ProductController.getSellerProducts);

// Admin routes for all products management
router.get('/admin/all-products', authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR), ProductController.getAllProductsAdmin);

// Product creation with Cloudinary upload for images and local storage for PDFs
router.post(
  '/',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR, ROLES.SELLER),
  uploadProduct.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 10 },
    { name: 'sizeChartImage', maxCount: 1 },
    { name: 'mainPdf', maxCount: 1 }
  ]),
  handleCloudinaryUpload([
    { fieldName: 'mainImage', resourceType: 'image', isMultiple: false },
    { fieldName: 'galleryImages', resourceType: 'image', isMultiple: true },
    { fieldName: 'sizeChartImage', resourceType: 'image', isMultiple: false }
  ]),
  ProductController.createProduct
);

// Product update with similar upload handling
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR, ROLES.SELLER),
  validateObjectId('id'),
  uploadProduct.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 10 },
    { name: 'sizeChartImage', maxCount: 1 },
    { name: 'mainPdf', maxCount: 1 }
  ]),
  handleCloudinaryUpload([
    { fieldName: 'mainImage', resourceType: 'image', isMultiple: false },
    { fieldName: 'galleryImages', resourceType: 'image', isMultiple: true },
    { fieldName: 'sizeChartImage', resourceType: 'image', isMultiple: false }
  ]),
  ProductController.updateProduct
);

// Quick update product status
router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR, ROLES.SELLER),
  validateObjectId('id'),
  ProductController.quickUpdateStatus
);

// Product deletion
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR, ROLES.SELLER),
  validateObjectId('id'),
  ProductController.deleteProduct
);

// Bulk operations
router.patch(
  '/bulk/update',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR),
  ProductController.bulkUpdateProducts
);

// AI Recommendation Score Update (for admin/ML system)
router.patch(
  '/:productId/ai-scores',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.MODERATOR),
  ProductController.updateAiScores
);

module.exports = router;