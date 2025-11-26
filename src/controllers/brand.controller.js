const { getCollection } = require('../config/database');
const { ObjectId } = require('mongodb');

class BrandController {
  // Create Brand
  static async createBrand(req, res) {
    try {
      const { name, description, logo, images, foundedYear, country, headquarters } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Brand name is required' });
      }

      if (!description || !description.trim()) {
        return res.status(400).json({ success: false, message: 'Brand description is required' });
      }

      const brandsCollection = getCollection('brands');
      
      // Check if brand exists
      const existingBrand = await brandsCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });

      if (existingBrand) {
        return res.status(409).json({ success: false, message: 'Brand already exists' });
      }

      const brandData = {
        name: name.trim(),
        description: description.trim(),
        logo: logo || '',
        images: Array.isArray(images) ? images : [],
        foundedYear: foundedYear || '',
        country: country || '',
        headquarters: headquarters || '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await brandsCollection.insertOne(brandData);

      res.status(201).json({
        success: true,
        message: 'Brand created successfully',
        data: { _id: result.insertedId, ...brandData }
      });
    } catch (error) {
      console.error('Create brand error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Get All Brands
  static async getBrands(req, res) {
    try {
      const { status, search } = req.query;
      const brandsCollection = getCollection('brands');

      let filter = {};
      
      if (status && status !== 'all') {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { country: { $regex: search, $options: 'i' } }
        ];
      }

      const brands = await brandsCollection
        .find(filter)
        .sort({ name: 1 })
        .toArray();

      res.json({
        success: true,
        data: brands
      });
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Get Brand by ID
  static async getBrandById(req, res) {
    try {
      const { id } = req.params;
      const brandsCollection = getCollection('brands');

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid brand ID' });
      }

      const brand = await brandsCollection.findOne({ _id: new ObjectId(id) });

      if (!brand) {
        return res.status(404).json({ success: false, message: 'Brand not found' });
      }

      res.json({ success: true, data: brand });
    } catch (error) {
      console.error('Get brand error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Update Brand
  static async updateBrand(req, res) {
    try {
      const { id } = req.params;
      const { name, description, logo, images, foundedYear, country, headquarters, status } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid brand ID' });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Brand name is required' });
      }

      if (!description || !description.trim()) {
        return res.status(400).json({ success: false, message: 'Brand description is required' });
      }

      const brandsCollection = getCollection('brands');

      // Check duplicate name
      const existingBrand = await brandsCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: new ObjectId(id) }
      });

      if (existingBrand) {
        return res.status(409).json({ success: false, message: 'Brand name already exists' });
      }

      const updateData = {
        name: name.trim(),
        description: description.trim(),
        logo: logo || '',
        images: Array.isArray(images) ? images : [],
        foundedYear: foundedYear || '',
        country: country || '',
        headquarters: headquarters || '',
        status: status || 'active',
        updatedAt: new Date()
      };

      const result = await brandsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Brand not found' });
      }

      res.json({ success: true, message: 'Brand updated successfully' });
    } catch (error) {
      console.error('Update brand error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Delete Brand
  static async deleteBrand(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid brand ID' });
      }

      const brandsCollection = getCollection('brands');
      const result = await brandsCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Brand not found' });
      }

      res.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
      console.error('Delete brand error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Toggle Status
  static async toggleBrandStatus(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid brand ID' });
      }

      const brandsCollection = getCollection('brands');
      const brand = await brandsCollection.findOne({ _id: new ObjectId(id) });

      if (!brand) {
        return res.status(404).json({ success: false, message: 'Brand not found' });
      }

      const newStatus = brand.status === 'active' ? 'inactive' : 'active';

      await brandsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: newStatus, updatedAt: new Date() } }
      );

      res.json({ 
        success: true, 
        message: `Brand ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
        data: { newStatus }
      });
    } catch (error) {
      console.error('Toggle status error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Get Active Brands
  static async getActiveBrands(req, res) {
    try {
      const brandsCollection = getCollection('brands');
      const brands = await brandsCollection
        .find({ status: 'active' })
        .sort({ name: 1 })
        .toArray();

      res.json({ success: true, data: brands });
    } catch (error) {
      console.error('Get active brands error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = BrandController;