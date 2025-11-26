const { getCollection } = require('../config/database');
const { ObjectId } = require('mongodb');

class CertificationController {
  // Create Certification
  static async createCertification(req, res) {
    try {
      const { 
        name, 
        issuingOrganization, 
        description = '', 
        validityPeriod = '', 
        website = '', 
        imageUrl = '',
        status = 'active'
      } = req.body;

      // Validation
      if (!name?.trim()) {
        return res.status(400).json({ success: false, message: 'Certification name is required' });
      }

      if (!issuingOrganization?.trim()) {
        return res.status(400).json({ success: false, message: 'Issuing organization is required' });
      }

      const certificationsCollection = getCollection('certifications');
      
      // Check if certification already exists
      const existingCertification = await certificationsCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        issuingOrganization: { $regex: new RegExp(`^${issuingOrganization.trim()}$`, 'i') }
      });

      if (existingCertification) {
        return res.status(409).json({ 
          success: false, 
          message: 'Certification with this name and organization already exists' 
        });
      }

      // Create certification data
      const certificationData = {
        name: name.trim(),
        issuingOrganization: issuingOrganization.trim(),
        description: description.trim(),
        validityPeriod: validityPeriod.trim(),
        website: website.trim(),
        imageUrl: imageUrl.trim(),
        status: status,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await certificationsCollection.insertOne(certificationData);

      res.status(201).json({
        success: true,
        message: 'Certification created successfully',
        data: { _id: result.insertedId, ...certificationData }
      });

    } catch (error) {
      console.error('Create certification error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get All Certifications
  static async getCertifications(req, res) {
    try {
      const { status, search } = req.query;
      const certificationsCollection = getCollection('certifications');

      let filter = {};
      
      // Status filter
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Search filter
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { issuingOrganization: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const certifications = await certificationsCollection
        .find(filter)
        .sort({ name: 1 })
        .toArray();

      res.json({
        success: true,
        data: certifications
      });

    } catch (error) {
      console.error('Get certifications error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get Certification by ID
  static async getCertificationById(req, res) {
    try {
      const { id } = req.params;
      const certificationsCollection = getCollection('certifications');

      // Validate ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid certification ID' });
      }

      const certification = await certificationsCollection.findOne({ 
        _id: new ObjectId(id) 
      });

      if (!certification) {
        return res.status(404).json({ success: false, message: 'Certification not found' });
      }

      res.json({ 
        success: true, 
        data: certification 
      });

    } catch (error) {
      console.error('Get certification error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Update Certification
  static async updateCertification(req, res) {
    try {
      const { id } = req.params;
      const { 
        name, 
        issuingOrganization, 
        description, 
        validityPeriod, 
        website, 
        imageUrl,
        status 
      } = req.body;

      // Validate ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid certification ID' });
      }

      // Validation
      if (!name?.trim()) {
        return res.status(400).json({ success: false, message: 'Certification name is required' });
      }

      if (!issuingOrganization?.trim()) {
        return res.status(400).json({ success: false, message: 'Issuing organization is required' });
      }

      const certificationsCollection = getCollection('certifications');

      // Check for duplicate certification (excluding current one)
      const existingCertification = await certificationsCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        issuingOrganization: { $regex: new RegExp(`^${issuingOrganization.trim()}$`, 'i') },
        _id: { $ne: new ObjectId(id) }
      });

      if (existingCertification) {
        return res.status(409).json({ 
          success: false, 
          message: 'Certification with this name and organization already exists' 
        });
      }

      // Prepare update data
      const updateData = {
        name: name.trim(),
        issuingOrganization: issuingOrganization.trim(),
        description: description ? description.trim() : '',
        validityPeriod: validityPeriod ? validityPeriod.trim() : '',
        website: website ? website.trim() : '',
        imageUrl: imageUrl ? imageUrl.trim() : '',
        status: status || 'active',
        updatedAt: new Date()
      };

      const result = await certificationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Certification not found' });
      }

      res.json({ 
        success: true, 
        message: 'Certification updated successfully' 
      });

    } catch (error) {
      console.error('Update certification error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Delete Certification
  static async deleteCertification(req, res) {
    try {
      const { id } = req.params;

      // Validate ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid certification ID' });
      }

      const certificationsCollection = getCollection('certifications');
      const result = await certificationsCollection.deleteOne({ 
        _id: new ObjectId(id) 
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Certification not found' });
      }

      res.json({ 
        success: true, 
        message: 'Certification deleted successfully' 
      });

    } catch (error) {
      console.error('Delete certification error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Toggle Certification Status
  static async toggleCertificationStatus(req, res) {
    try {
      const { id } = req.params;

      // Validate ObjectId
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid certification ID' });
      }

      const certificationsCollection = getCollection('certifications');
      
      // Find certification
      const certification = await certificationsCollection.findOne({ 
        _id: new ObjectId(id) 
      });

      if (!certification) {
        return res.status(404).json({ success: false, message: 'Certification not found' });
      }

      // Toggle status
      const newStatus = certification.status === 'active' ? 'inactive' : 'active';

      await certificationsCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: newStatus, 
            updatedAt: new Date() 
          } 
        }
      );

      res.json({ 
        success: true, 
        message: `Certification ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
        data: { newStatus }
      });

    } catch (error) {
      console.error('Toggle certification status error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get Active Certifications
  static async getActiveCertifications(req, res) {
    try {
      const certificationsCollection = getCollection('certifications');
      const certifications = await certificationsCollection
        .find({ status: 'active' })
        .sort({ name: 1 })
        .toArray();

      res.json({ 
        success: true, 
        data: certifications 
      });

    } catch (error) {
      console.error('Get active certifications error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get Certification Statistics
  static async getCertificationStats(req, res) {
    try {
      const certificationsCollection = getCollection('certifications');

      // Status statistics
      const statusStats = await certificationsCollection.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      // Total count
      const total = await certificationsCollection.countDocuments();

      res.json({
        success: true,
        data: {
          total,
          byStatus: statusStats
        }
      });

    } catch (error) {
      console.error('Get certification stats error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Bulk Create Certifications
  static async bulkCreateCertifications(req, res) {
    try {
      const { certifications } = req.body;
      
      if (!Array.isArray(certifications) || certifications.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Certifications array is required' 
        });
      }

      const certificationsCollection = getCollection('certifications');
      
      // Validate each certification
      const validCertifications = [];
      const errors = [];

      for (const [index, cert] of certifications.entries()) {
        if (!cert.name?.trim() || !cert.issuingOrganization?.trim()) {
          errors.push(`Certification ${index + 1}: Name and issuing organization are required`);
          continue;
        }

        // Check for duplicates in the input array
        const isDuplicate = validCertifications.some(
          existing => 
            existing.name.toLowerCase() === cert.name.toLowerCase() &&
            existing.issuingOrganization.toLowerCase() === cert.issuingOrganization.toLowerCase()
        );

        if (isDuplicate) {
          errors.push(`Certification ${index + 1}: Duplicate certification in input`);
          continue;
        }

        validCertifications.push({
          name: cert.name.trim(),
          issuingOrganization: cert.issuingOrganization.trim(),
          description: cert.description ? cert.description.trim() : '',
          validityPeriod: cert.validityPeriod ? cert.validityPeriod.trim() : '',
          website: cert.website ? cert.website.trim() : '',
          imageUrl: cert.imageUrl ? cert.imageUrl.trim() : '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors
        });
      }

      // Check for existing certifications in database
      const existingCertifications = await certificationsCollection.find({
        $or: validCertifications.map(cert => ({
          name: { $regex: new RegExp(`^${cert.name}$`, 'i') },
          issuingOrganization: { $regex: new RegExp(`^${cert.issuingOrganization}$`, 'i') }
        }))
      }).toArray();

      if (existingCertifications.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Some certifications already exist',
          data: existingCertifications 
        });
      }

      const result = await certificationsCollection.insertMany(validCertifications);

      res.status(201).json({
        success: true,
        message: `${result.insertedCount} certifications created successfully`,
        data: { insertedCount: result.insertedCount }
      });

    } catch (error) {
      console.error('Bulk create certifications error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = CertificationController;