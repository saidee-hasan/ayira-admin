const express = require('express');
const CertificationController = require('../controllers/certification.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', CertificationController.getCertifications);
router.get('/active', CertificationController.getActiveCertifications);
router.get('/stats', CertificationController.getCertificationStats);
router.get('/:id', CertificationController.getCertificationById);

// Protected routes (Admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), CertificationController.createCertification);
router.put('/:id', authenticateToken, authorizeRoles('admin'), CertificationController.updateCertification);
router.patch('/:id/toggle-status', authenticateToken, authorizeRoles('admin'), CertificationController.toggleCertificationStatus);
router.delete('/:id', authenticateToken, authorizeRoles('admin'), CertificationController.deleteCertification);
router.post('/bulk', authenticateToken, authorizeRoles('admin'), CertificationController.bulkCreateCertifications);

module.exports = router;