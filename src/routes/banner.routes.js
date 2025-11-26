const express = require('express');
const BannerController = require('../controllers/banner.controller');
const { uploadBanner } = require('../middleware/upload');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.get('/', BannerController.getBanners);

// Protected routes (Admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin'),
  uploadBanner.single('image'),
  BannerController.createBanner
);

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  validateObjectId('id'),
  BannerController.deleteBanner
);

module.exports = router;