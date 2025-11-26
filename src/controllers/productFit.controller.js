// src/controllers/productFit.controller.js
const { getCollection } = require('../config/database');
const { ApiResponse } = require('../utils/apiResponse');
const { ObjectId } = require('mongodb');

class ProductFitController {
  // Create Product Fit
  static async createProductFit(req, res) {
    try {
      const { name, description, status = 'active' } = req.body;

      if (!name || name.trim() === '') {
        return ApiResponse.error(res, 'Product fit name is required', 400);
      }

      const productFitsCollection = getCollection('productFits');
      if (!productFitsCollection) {
        return ApiResponse.error(res, 'Product fits collection not available', 500);
      }

      // Check if product fit already exists
      const existingFit = await productFitsCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });

      if (existingFit) {
        return ApiResponse.error(res, 'Product fit already exists', 409);
      }

      const fitData = {
        name: name.trim(),
        description: description?.trim() || '',
        status: status,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await productFitsCollection.insertOne(fitData);

      return ApiResponse.success(
        res,
        {
          _id: result.insertedId,
          ...fitData
        },
        'Product fit created successfully',
        201
      );
    } catch (error) {
      console.error('Create product fit error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get All Product Fits
  static async getProductFits(req, res) {
    try {
      const { status, page = 1, limit = 50, search } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const productFitsCollection = getCollection('productFits');
      if (!productFitsCollection) {
        return ApiResponse.error(res, 'Product fits collection not available', 500);
      }

      let filter = {};
      
      // Status filter
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Search filter
      if (search && search.trim() !== '') {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const productFits = await productFitsCollection
        .find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray();

      const total = await productFitsCollection.countDocuments(filter);

      // Get counts for stats
      const activeCount = await productFitsCollection.countDocuments({ ...filter, status: 'active' });
      const inactiveCount = await productFitsCollection.countDocuments({ ...filter, status: 'inactive' });

      return ApiResponse.success(res, {
        productFits,
        stats: {
          total,
          active: activeCount,
          inactive: inactiveCount
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get product fits error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Product Fit by ID
  static async getProductFitById(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid product fit ID', 400);
      }

      const productFitsCollection = getCollection('productFits');
      if (!productFitsCollection) {
        return ApiResponse.error(res, 'Product fits collection not available', 500);
      }

      const productFit = await productFitsCollection.findOne({
        _id: new ObjectId(id)
      });

      if (!productFit) {
        return ApiResponse.error(res, 'Product fit not found', 404);
      }

      return ApiResponse.success(res, productFit);
    } catch (error) {
      console.error('Get product fit by ID error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Update Product Fit
  static async updateProductFit(req, res) {
    try {
      const { id } = req.params;
      const { name, description, status } = req.body;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid product fit ID', 400);
      }

      if (!name || name.trim() === '') {
        return ApiResponse.error(res, 'Product fit name is required', 400);
      }

      const productFitsCollection = getCollection('productFits');
      if (!productFitsCollection) {
        return ApiResponse.error(res, 'Product fits collection not available', 500);
      }

      // Check if product fit with same name already exists (excluding current)
      const existingFit = await productFitsCollection.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: new ObjectId(id) }
      });

      if (existingFit) {
        return ApiResponse.error(res, 'Product fit with this name already exists', 409);
      }

      const updateData = {
        name: name.trim(),
        description: description?.trim() || '',
        status: status || 'active',
        updatedAt: new Date()
      };

      const result = await productFitsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Product fit not found', 404);
      }

      return ApiResponse.success(res, null, 'Product fit updated successfully');
    } catch (error) {
      console.error('Update product fit error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Delete Product Fit
  static async deleteProductFit(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid product fit ID', 400);
      }

      const productFitsCollection = getCollection('productFits');
      if (!productFitsCollection) {
        return ApiResponse.error(res, 'Product fits collection not available', 500);
      }

      const result = await productFitsCollection.deleteOne({
        _id: new ObjectId(id)
      });

      if (result.deletedCount === 0) {
        return ApiResponse.error(res, 'Product fit not found', 404);
      }

      return ApiResponse.success(res, null, 'Product fit deleted successfully');
    } catch (error) {
      console.error('Delete product fit error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Toggle Product Fit Status
  static async toggleProductFitStatus(req, res) {
    try {
      const { id } = req.params;

      if (!ObjectId.isValid(id)) {
        return ApiResponse.error(res, 'Invalid product fit ID', 400);
      }

      const productFitsCollection = getCollection('productFits');
      if (!productFitsCollection) {
        return ApiResponse.error(res, 'Product fits collection not available', 500);
      }

      // Get current fit
      const currentFit = await productFitsCollection.findOne({
        _id: new ObjectId(id)
      });

      if (!currentFit) {
        return ApiResponse.error(res, 'Product fit not found', 404);
      }

      const newStatus = currentFit.status === 'active' ? 'inactive' : 'active';

      const result = await productFitsCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            status: newStatus,
            updatedAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        return ApiResponse.error(res, 'Product fit not found', 404);
      }

      return ApiResponse.success(res, { newStatus }, `Product fit ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Toggle product fit status error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Search Product Fits
  static async searchProductFits(req, res) {
    try {
      const { q, status } = req.query;

      if (!q || q.trim() === '') {
        return ApiResponse.success(res, []);
      }

      const productFitsCollection = getCollection('productFits');
      if (!productFitsCollection) {
        return ApiResponse.error(res, 'Product fits collection not available', 500);
      }

      let filter = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } }
        ]
      };

      if (status && status !== 'all') {
        filter.status = status;
      }

      const productFits = await productFitsCollection
        .find(filter)
        .limit(10)
        .toArray();

      return ApiResponse.success(res, productFits);
    } catch (error) {
      console.error('Search product fits error:', error);
      return ApiResponse.error(res, error.message);
    }
  }

  // Get Active Product Fits (for dropdowns)
  static async getActiveProductFits(req, res) {
    try {
      const productFitsCollection = getCollection('productFits');
      if (!productFitsCollection) {
        return ApiResponse.error(res, 'Product fits collection not available', 500);
      }

      const productFits = await productFitsCollection
        .find({ status: 'active' })
        .sort({ name: 1 })
        .toArray();

      return ApiResponse.success(res, productFits);
    } catch (error) {
      console.error('Get active product fits error:', error);
      return ApiResponse.error(res, error.message);
    }
  }
}

module.exports = ProductFitController;