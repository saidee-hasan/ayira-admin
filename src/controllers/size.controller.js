const { getCollection } = require('../config/database');
const { ObjectId } = require('mongodb');

class SizeController {
  // Create Size
  static async createSize(req, res) {
    try {
      const { value, status = 'active' } = req.body;

      if (!value || !value.trim()) {
        return res.status(400).json({ success: false, message: 'Size value is required' });
      }

      const sizesCollection = getCollection('sizes');
      
      // Check if size exists
      const existingSize = await sizesCollection.findOne({
        value: { $regex: new RegExp(`^${value.trim()}$`, 'i') }
      });

      if (existingSize) {
        return res.status(409).json({ success: false, message: 'Size already exists' });
      }

      const sizeData = {
        value: value.trim(),
        status: status,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await sizesCollection.insertOne(sizeData);

      res.status(201).json({
        success: true,
        message: 'Size created successfully',
        data: { _id: result.insertedId, ...sizeData }
      });
    } catch (error) {
      console.error('Create size error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Get All Sizes
  static async getSizes(req, res) {
    try {
      const { status, search } = req.query;
      const sizesCollection = getCollection('sizes');

      let filter = {};
      
      if (status && status !== 'all') {
        filter.status = status;
      }

      if (search) {
        filter.value = { $regex: search, $options: 'i' };
      }

      const sizes = await sizesCollection
        .find(filter)
        .sort({ value: 1 })
        .toArray();

      res.json({
        success: true,
        data: sizes
      });
    } catch (error) {
      console.error('Get sizes error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Get Size by ID
  static async getSizeById(req, res) {
    try {
      const { id } = req.params;
      const sizesCollection = getCollection('sizes');

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid size ID' });
      }

      const size = await sizesCollection.findOne({ _id: new ObjectId(id) });

      if (!size) {
        return res.status(404).json({ success: false, message: 'Size not found' });
      }

      res.json({ success: true, data: size });
    } catch (error) {
      console.error('Get size error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Update Size
  static async updateSize(req, res) {
    try {
      const { id } = req.params;
      const { value, status } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid size ID' });
      }

      if (!value || !value.trim()) {
        return res.status(400).json({ success: false, message: 'Size value is required' });
      }

      const sizesCollection = getCollection('sizes');

      // Check duplicate size
      const existingSize = await sizesCollection.findOne({
        value: { $regex: new RegExp(`^${value.trim()}$`, 'i') },
        _id: { $ne: new ObjectId(id) }
      });

      if (existingSize) {
        return res.status(409).json({ success: false, message: 'Size already exists' });
      }

      const updateData = {
        value: value.trim(),
        status: status || 'active',
        updatedAt: new Date()
      };

      const result = await sizesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Size not found' });
      }

      res.json({ success: true, message: 'Size updated successfully' });
    } catch (error) {
      console.error('Update size error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Delete Size
  static async deleteSize(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid size ID' });
      }

      const sizesCollection = getCollection('sizes');
      const result = await sizesCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'Size not found' });
      }

      res.json({ success: true, message: 'Size deleted successfully' });
    } catch (error) {
      console.error('Delete size error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Toggle Status
  static async toggleSizeStatus(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid size ID' });
      }

      const sizesCollection = getCollection('sizes');
      const size = await sizesCollection.findOne({ _id: new ObjectId(id) });

      if (!size) {
        return res.status(404).json({ success: false, message: 'Size not found' });
      }

      const newStatus = size.status === 'active' ? 'inactive' : 'active';

      await sizesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: newStatus, updatedAt: new Date() } }
      );

      res.json({ 
        success: true, 
        message: `Size ${newStatus === 'active' ? 'activated' : 'deactivated'}`,
        data: { newStatus }
      });
    } catch (error) {
      console.error('Toggle status error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Get Active Sizes
  static async getActiveSizes(req, res) {
    try {
      const sizesCollection = getCollection('sizes');
      const sizes = await sizesCollection
        .find({ status: 'active' })
        .sort({ value: 1 })
        .toArray();

      res.json({ success: true, data: sizes });
    } catch (error) {
      console.error('Get active sizes error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Bulk Create Sizes
  static async bulkCreateSizes(req, res) {
    try {
      const { sizes } = req.body;
      
      if (!Array.isArray(sizes) || sizes.length === 0) {
        return res.status(400).json({ success: false, message: 'Sizes array is required' });
      }

      const sizesCollection = getCollection('sizes');
      
      // Check for existing sizes
      const existingSizes = await sizesCollection.find({
        value: { $in: sizes.map(s => s.value) }
      }).toArray();

      if (existingSizes.length > 0) {
        return res.status(409).json({ 
          success: false, 
          message: 'Some sizes already exist',
          data: existingSizes 
        });
      }

      const sizesWithTimestamps = sizes.map(size => ({
        value: size.value,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const result = await sizesCollection.insertMany(sizesWithTimestamps);

      res.status(201).json({
        success: true,
        message: `${result.insertedCount} sizes created successfully`,
        data: { insertedIds: result.insertedIds }
      });
    } catch (error) {
      console.error('Bulk create sizes error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = SizeController;